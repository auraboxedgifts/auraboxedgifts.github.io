#!/usr/bin/env node
/**
 * Resize + recompress catalog images in place (same filenames/extensions)
 * so existing GitHub Pages + Oracle absolute URLs keep working.
 *
 * Usage: node scripts/optimize-images.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../../..');
const IMAGES_ROOT = path.join(ROOT, 'images');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_EDGE_DEFAULT = 1400;
const MAX_EDGE_LOGO = 256;
const JPEG_QUALITY = 78;
const WEBP_QUALITY = 78;
const PNG_QUALITY = 80;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (IMAGE_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function maxEdgeFor(filePath) {
  const base = path.basename(filePath).toLowerCase();
  if (base === 'logo.jpeg' || base === 'logo.jpg' || base === 'logo.png' || base === 'logo.webp') {
    return MAX_EDGE_LOGO;
  }
  if (base.includes('auraboxedgifts') && (base.endsWith('.png') || base.endsWith('.jpeg') || base.endsWith('.jpg'))) {
    return 800;
  }
  return MAX_EDGE_DEFAULT;
}

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const before = fs.statSync(filePath).size;
  const maxEdge = maxEdgeFor(filePath);
  const tmp = `${filePath}.opt-tmp`;
  const base = path.basename(filePath).toLowerCase();
  const isLogo = base.startsWith('logo.');

  try {
    let pipeline = sharp(filePath, { failOn: 'none' })
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true
      });

    if (ext === '.jpg' || ext === '.jpeg') {
      // Logos with transparency must never be forced into opaque black JPEG.
      if (isLogo) {
        pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } })
          .jpeg({ quality: 85, mozjpeg: true });
      } else {
        pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
      }
    } else if (ext === '.png') {
      pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9, effort: 8, palette: false });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: isLogo ? 90 : WEBP_QUALITY, alphaQuality: 100 });
    }

    await pipeline.toFile(tmp);
    const after = fs.statSync(tmp).size;

    // Keep original if optimization somehow grew the file
    if (after >= before) {
      fs.unlinkSync(tmp);
      return { filePath, before, after: before, skipped: true };
    }

    fs.renameSync(tmp, filePath);
    return { filePath, before, after, skipped: false };
  } catch (err) {
    if (fs.existsSync(tmp)) {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
    return { filePath, before, after: before, skipped: true, error: err.message };
  }
}

async function main() {
  const files = walk(IMAGES_ROOT);
  console.log(`Optimizing ${files.length} images under ${IMAGES_ROOT}`);

  let saved = 0;
  let beforeTotal = 0;
  let afterTotal = 0;
  let errors = 0;

  for (const file of files) {
    const result = await optimizeFile(file);
    beforeTotal += result.before;
    afterTotal += result.after;
    if (result.error) {
      errors += 1;
      console.warn(`  FAIL ${path.relative(ROOT, file)}: ${result.error}`);
      continue;
    }
    if (!result.skipped) {
      saved += 1;
      const pct = ((1 - result.after / result.before) * 100).toFixed(0);
      console.log(
        `  OK  ${path.relative(ROOT, file)}  ${(result.before / 1024).toFixed(0)}KB → ${(result.after / 1024).toFixed(0)}KB (−${pct}%)`
      );
    }
  }

  console.log('\nDone.');
  console.log(`  Changed: ${saved}/${files.length}`);
  console.log(`  Errors:  ${errors}`);
  console.log(
    `  Total:   ${(beforeTotal / 1024 / 1024).toFixed(1)}MB → ${(afterTotal / 1024 / 1024).toFixed(1)}MB`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
