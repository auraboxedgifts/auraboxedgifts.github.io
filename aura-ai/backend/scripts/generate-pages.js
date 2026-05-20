const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const collectionsDir = path.join(rootDir, 'collections');
const productsPath = path.join(__dirname, '../data/products.json');
const collectionsPath = path.join(__dirname, '../data/collections.json');

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
const collections = JSON.parse(fs.readFileSync(collectionsPath, 'utf8'));

function formatInr(amount) {
    return `Rs. ${Number(amount).toFixed(2)}`;
}

function renderPage(collection) {
    const list = products.filter((p) => p.collection === collection.slug);
    const imageCards = list.map((p, idx) => `
      <div class="col-item col-item-reveal" style="animation-delay: ${(idx * 0.1).toFixed(1)}s" data-idx="${idx}" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-img="..${p.image}" data-description="${p.description.replace(/"/g, '&quot;')}">
        <div class="col-item-img-wrapper">
          <img src="..${p.image}" alt="${p.name}" loading="lazy">
          <div class="col-item-zoom"><i class="fas fa-search-plus"></i></div>
        </div>
        <div class="col-item-info">
          <h3 class="col-item-title">${p.name}</h3>
          <p class="col-item-price">${formatInr(p.price)}</p>
          <button class="btn-add-cart" data-add-idx="${idx}"><i class="fas fa-shopping-cart"></i> Add to cart</button>
        </div>
      </div>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aura Boxed Gifts - ${collection.name}</title>
  <meta name="description" content="${collection.description}">
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
    <h1 class="col-hero-title">${collection.name}</h1>
    <p class="col-hero-desc">${collection.description}</p>
    <div class="col-hero-divider"></div>
    <p class="col-breadcrumb"><a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html';} return false;">Home</a> / <a href="#" onclick="if(window.parent!==window){window.parent.postMessage('closeCollection','*');}else{window.location.href='../index.html#collections';} return false;">Collections</a> / ${collection.name}</p>
  </section>

  <section class="col-gallery">
    <div class="col-grid">
${imageCards}
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

for (const collection of collections) {
    const outPath = path.join(collectionsDir, `${collection.slug}.html`);
    fs.writeFileSync(outPath, renderPage(collection));
    console.log(`Generated ${collection.slug}.html`);
}
