const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const collectionsDir = path.join(rootDir, 'collections');
const productsPath = path.join(__dirname, '../data/products.json');
const collectionsPath = path.join(__dirname, '../data/collections.json');

function formatInr(amount) {
    return `Rs. ${Number(amount).toFixed(2)}`;
}

function escapeAttr(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderPage(collection, products) {
    const list = products.filter((p) => p.collection === collection.slug);
    const imageCards = list.map((p, idx) => {
        const imgPath = p.image && /^https?:/i.test(p.image) ? p.image : `..${p.image}`;
        return `
      <div class="col-item col-item-reveal" style="animation-delay: ${(idx * 0.1).toFixed(1)}s" data-idx="${idx}" data-id="${escapeAttr(p.id)}" data-name="${escapeAttr(p.name)}" data-price="${escapeAttr(p.price)}" data-img="${escapeAttr(imgPath)}" data-description="${escapeAttr(p.description || '')}">
        <div class="col-item-img-wrapper">
          <img src="${escapeAttr(imgPath)}" alt="${escapeAttr(p.name)}" loading="lazy">
          <div class="col-item-zoom"><i class="fas fa-search-plus"></i></div>
        </div>
        <div class="col-item-info">
          <h3 class="col-item-title">${escapeAttr(p.name)}</h3>
          <p class="col-item-price">${formatInr(p.price)}</p>
          <button class="btn-add-cart" data-add-idx="${idx}"><i class="fas fa-shopping-cart"></i> Add to cart</button>
        </div>
      </div>`;
    }).join('\n');

    const emptyState = list.length ? '' : `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-medium);">
        <h3 style="font-family:'Playfair Display',serif;margin-bottom:8px;">No products yet</h3>
        <p>New arrivals coming soon — check back in a bit!</p>
      </div>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Boxed Gifts - ${escapeAttr(collection.name)}</title>
  <meta name="description" content="${escapeAttr(collection.description)}">
  <link rel="stylesheet" href="collection.css">
  <link rel="stylesheet" href="../style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="icon" type="image/jpeg" href="../images/logo.jpeg">
</head>
<body>
  <nav class="col-nav">
    <a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html';} return false;" class="col-nav-back"><i class="fas fa-arrow-left"></i> Back</a>
    <a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html';} return false;" class="col-nav-logo"><img src="../images/logo.jpeg" alt="Aura Boxed Gifts"></a>
    <div class="col-nav-links">
      <a href="#" id="navCartIcon" aria-label="Cart" style="position: relative; margin-right: 15px;">
        <i class="fas fa-shopping-cart"></i>
        <span class="nav-cart-badge" id="navCartBadge">0</span>
      </a>
      <a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html';} return false;" class="nav-text-link">Home</a>
      <a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html#collections';} return false;" class="nav-text-link">Collections</a>
      <a href="https://www.instagram.com/aura_boxedgifts" target="_blank"><i class="fab fa-instagram"></i></a>
    </div>
  </nav>

  <section class="col-hero">
    <p class="col-hero-label">Collection</p>
    <h1 class="col-hero-title">${escapeAttr(collection.name)}</h1>
    <p class="col-hero-desc">${escapeAttr(collection.description)}</p>
    <div class="col-hero-divider"></div>
    <p class="col-breadcrumb"><a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html';} return false;">Home</a> / <a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html#collections';} return false;">Collections</a> / ${escapeAttr(collection.name)}</p>
  </section>

  <section class="col-gallery">
    <div class="col-grid">
${imageCards}${emptyState}
    </div>
  </section>

  <section class="col-cta">
    <h2 class="col-cta-title">Love what you see?</h2>
    <p class="col-cta-text">DM us on Instagram to customize your final hamper and gifting card.</p>
    <a href="https://www.instagram.com/aura_boxedgifts" target="_blank" class="col-btn-ig"><i class="fab fa-instagram"></i> Order on Instagram</a>
  </section>

  <footer class="col-footer">
    <p>&copy; 2026 Aura Boxed Gifts. All rights reserved.</p>
  </footer>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script src="../js/api.js"></script>
  <script src="../js/auth.js"></script>
  <script src="../js/cart.js"></script>
  <script src="../js/checkout.js"></script>
  <script src="../js/admin.js"></script>
  <script src="../js/lightbox.js"></script>
</body>
</html>`;
}

function generateAllPages() {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));

    if (!fs.existsSync(collectionsDir)) {
        fs.mkdirSync(collectionsDir, { recursive: true });
    }

    const generated = [];
    const validSlugs = new Set(collections.map((c) => c.slug));
    for (const collection of collections) {
        const outPath = path.join(collectionsDir, `${collection.slug}.html`);
        fs.writeFileSync(outPath, renderPage(collection, products));
        generated.push(`${collection.slug}.html`);
    }

    try {
        const entries = fs.readdirSync(collectionsDir);
        for (const entry of entries) {
            if (!entry.endsWith('.html')) continue;
            const slug = entry.replace(/\.html$/, '');
            if (!validSlugs.has(slug)) {
                fs.unlinkSync(path.join(collectionsDir, entry));
            }
        }
    } catch (err) {
        // Best-effort cleanup; ignore failures
    }

    return generated;
}

if (require.main === module) {
    const generated = generateAllPages();
    generated.forEach((file) => console.log(`Generated ${file}`));
}

module.exports = { generateAllPages };
