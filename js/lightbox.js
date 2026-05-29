(function () {
  let images = [];
  let currentIndex = 0;
  let lightbox;

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

  function resolveImagePath(image) {
    if (!image) return '';
    if (/^https?:/i.test(image)) return image;
    return `..${image}`;
  }

  function buildImages() {
    images = Array.from(document.querySelectorAll('.col-item')).map(function (item) {
      const img = item.querySelector('img');
      return {
        idx: Number(item.dataset.idx || 0),
        productId: item.dataset.id || '',
        src: img ? img.src : '',
        name: item.dataset.name || '',
        price: Number(item.dataset.price || 0),
        description: item.dataset.description || '',
        img: item.dataset.img || (img ? img.getAttribute('src') : '')
      };
    });
  }

  function cardMarkup(p, idx) {
    const imgPath = resolveImagePath(p.image);
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
  }

  function updateInfo() {
    const p = images[currentIndex];
    if (!p) return;
    lightbox.querySelector('.lightbox-img').src = p.src;
    lightbox.querySelector('#lbProductName').textContent = p.name;
    lightbox.querySelector('#lbProductPrice').textContent = `Rs. ${p.price}.00`;
    lightbox.querySelector('#lbProductDesc').textContent = p.description || '';
    lightbox.querySelector('.lightbox-counter').textContent = `${currentIndex + 1} / ${images.length}`;

    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'context_update',
        productId: p.productId,
        productName: p.name,
        productPrice: p.price,
        productImg: p.img
      }, '*');
    }
  }

  function openLightbox(index) {
    currentIndex = Math.max(0, Math.min(images.length - 1, Number(index || 0)));
    updateInfo();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function next() {
    if (!images.length) return;
    currentIndex = (currentIndex + 1) % images.length;
    updateInfo();
  }

  function prev() {
    if (!images.length) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateInfo();
  }

  function bindCards() {
    document.querySelectorAll('.col-item').forEach(function (item) {
      if (item.dataset.bound === '1') return;
      item.dataset.bound = '1';
      item.addEventListener('click', function (e) {
        if (e.target.closest('.btn-add-cart')) return;
        openLightbox(Number(item.dataset.idx || 0));
      });
    });
    document.querySelectorAll('.btn-add-cart').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = Number(btn.dataset.addIdx || 0);
        const p = images[idx];
        if (!p) return;
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'addToCart', productId: p.productId, item: p.name, img: p.img, price: p.price }, '*');
        } else {
          AuraCart.addToCartById(p.productId);
        }
      });
    });
  }

  function currentSlug() {
    const grid = document.querySelector('.col-grid');
    if (grid && grid.dataset.collection) return grid.dataset.collection;
    const file = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    return file || '';
  }

  // Refresh the grid from live catalog data so admin edits (price, name, image,
  // add/remove/reorder) appear on the storefront without re-deploying static pages.
  async function hydrateFromApi() {
    if (!(window.AuraApi && typeof window.AuraApi.apiFetch === 'function')) return;
    const slug = currentSlug();
    if (!slug) return;
    let products;
    try {
      const res = await window.AuraApi.apiFetch('/api/products');
      products = Array.isArray(res.data) ? res.data : null;
    } catch (err) {
      return; // keep the static content on any failure
    }
    if (!products) return;

    const grid = document.querySelector('.col-grid');
    if (!grid) return;
    const list = products.filter((p) => p.collection === slug);

    if (!list.length) {
      grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-medium);">
        <h3 style="font-family:'Playfair Display',serif;margin-bottom:8px;">No products yet</h3>
        <p>New arrivals coming soon — check back in a bit!</p>
      </div>`;
    } else {
      grid.innerHTML = list.map((p, idx) => cardMarkup(p, idx)).join('\n');
    }
    buildImages();
    bindCards();
  }

  function init() {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <button class="lightbox-prev" aria-label="Previous">&#8249;</button>
      <img class="lightbox-img" src="" alt="Product image">
      <button class="lightbox-next" aria-label="Next">&#8250;</button>
      <div class="lightbox-info">
        <span class="lightbox-product-name" id="lbProductName"></span>
        <span class="lightbox-product-price" id="lbProductPrice"></span>
        <span class="lightbox-product-price" id="lbProductDesc"></span>
        <button class="btn-add-cart" id="lbAddToCartBtn"><i class="fas fa-shopping-cart"></i> Add to cart</button>
      </div>
      <div class="lightbox-counter"></div>`;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-next').addEventListener('click', next);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', prev);
    lightbox.querySelector('#lbAddToCartBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      const p = images[currentIndex];
      if (!p) return;
      AuraCart.addToCartById(p.productId);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'context_update', action: 'added_to_cart', productName: p.name, productPrice: p.price }, '*');
      }
    });

    // Bind to the static content first so the page is usable instantly, then
    // refresh from the live API.
    buildImages();
    bindCards();

    window.addEventListener('message', function (e) {
      if (!e.data) return;
      if (e.data.type === 'next_product') {
        if (!lightbox.classList.contains('active')) openLightbox(0);
        else next();
      } else if (e.data.type === 'previous_product') {
        if (!lightbox.classList.contains('active')) openLightbox(0);
        else prev();
      } else if (e.data.type === 'view_product') {
        const index = Math.max(0, Number(e.data.index || 1) - 1);
        openLightbox(index);
      }
    });

    hydrateFromApi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
