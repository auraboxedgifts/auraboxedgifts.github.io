#!/usr/bin/env node
/**
 * Convert PNG catalog images to WebP and rewrite references across the repo.
 * Keeps Oracle/Pages paths working after deploy (same basename, new extension).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../../..');
const IMAGES_ROOT = path.join(ROOT, 'images');
const MAX_EDGE = 1400;
const WEBP_QUALITY = 76;

const TEXT_EXTS = new Set(['.html', '.js', '.json', '.css', '.md', '.txt', '.xml']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'aura-orders-app', 'build', '.gradle']);

function walkImages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkImages(full, out);
    else if (path.extname(entry.name).toLowerCase() === '.png') out.push(full);
  }
  return out;
}

function walkText(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkText(full, out);
    else if (TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function convertPng(filePath) {
  const webpPath = filePath.replace(/\.png$/i, '.webp');
  const before = fs.statSync(filePath).size;
  const maxEdge = path.basename(filePath).toLowerCase().includes('auraboxedgifts') ? 800 : MAX_EDGE;

  await sharp(filePath, { failOn: 'none' })
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(webpPath);

  const after = fs.statSync(webpPath).size;
  fs.unlinkSync(filePath);
  return { filePath, webpPath, before, after };
}

function rewriteReferences(replacements) {
  const files = walkText(ROOT);
  let filesTouched = 0;
  let replacementsMade = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
      if (!content.includes(from)) continue;
      const next = content.split(from).join(to);
      if (next !== content) {
        const count = content.split(from).length - 1;
        replacementsMade += count;
        content = next;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      filesTouched += 1;
      console.log(`  REF ${path.relative(ROOT, file)}`);
    }
  }
  return { filesTouched, replacementsMade };
}

async function main() {
  const pngs = walkImages(IMAGES_ROOT);
  console.log(`Converting ${pngs.length} PNGs to WebP…`);

  const replacements = [];
  let beforeTotal = 0;
  let afterTotal = 0;

  for (const png of pngs) {
    const result = await convertPng(png);
    beforeTotal += result.before;
    afterTotal += result.after;
    const fromName = path.basename(result.filePath);
    const toName = path.basename(result.webpPath);
    replacements.push([fromName, toName]);
    console.log(
      `  OK  ${path.relative(ROOT, png)}  ${(result.before / 1024).toFixed(0)}KB → ${(result.after / 1024).toFixed(0)}KB`
    );
  }

  // Prefer longer filenames first to avoid partial collisions (unlikely but safe)
  replacements.sort((a, b) => b[0].length - a[0].length);

  console.log('\nRewriting references…');
  const ref = rewriteReferences(replacements);

  console.log('\nDone.');
  console.log(`  Converted: ${pngs.length}`);
  console.log(`  Size: ${(beforeTotal / 1024 / 1024).toFixed(1)}MB → ${(afterTotal / 1024 / 1024).toFixed(1)}MB`);
  console.log(`  Files updated: ${ref.filesTouched}, replacements: ${ref.replacementsMade}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
