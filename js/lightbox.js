(function () {
  let images = [];
  let currentIndex = 0;
  let lightbox;
  let localCart = [];
  let cartMirrorReady = false;

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
    if (window.AuraApi && typeof window.AuraApi.resolveAssetPath === 'function') {
      const resolved = window.AuraApi.resolveAssetPath(image);
      if (/^https?:/i.test(resolved)) return resolved;
      if (resolved.startsWith('/')) return `..${resolved}`;
      return resolved;
    }
    if (/^https?:/i.test(image)) return image;
    return `..${image}`;
  }

  function getCartSnapshot() {
    if (window.parent !== window && cartMirrorReady) {
      return localCart.slice();
    }
    if (window.AuraCart && typeof window.AuraCart.getItems === 'function') {
      return window.AuraCart.getItems();
    }
    if (localCart.length) return localCart.slice();
    try {
      return JSON.parse(localStorage.getItem('aura_cart_v2') || '[]');
    } catch (e) {
      return [];
    }
  }

  function getCartQty(productId) {
    const item = getCartSnapshot().find(function (c) { return c.productId === productId; });
    return item ? (item.qty || 1) : 0;
  }

  function addBtnMarkup(idx) {
    return `<button type="button" class="btn-add-cart" data-add-idx="${idx}"><i class="fas fa-shopping-cart"></i> Add to cart</button>`;
  }

  function qtyControlMarkup(productId, idx, qty) {
    return `<div class="btn-qty-control" data-product-id="${escapeAttr(productId)}" data-add-idx="${idx}">
      <button type="button" class="qty-minus" aria-label="Decrease quantity">−</button>
      <span class="qty-value">${qty}</span>
      <button type="button" class="qty-plus" aria-label="Increase quantity">+</button>
    </div>`;
  }

  function cartActionMarkup(productId, idx) {
    const qty = getCartQty(productId);
    return qty > 0 ? qtyControlMarkup(productId, idx, qty) : addBtnMarkup(idx);
  }

  function bumpQty(productId, delta) {
    if (!productId) return;
    const snapshot = getCartSnapshot();
    const current = snapshot.find(function (c) { return c.productId === productId; });
    const qty = current ? (current.qty || 1) : 0;

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'updateQtyById', productId: productId, delta: delta }, '*');
      let next = localCart.slice();
      if (!next.length && cartMirrorReady) next = [];
      else if (!next.length) next = snapshot.map(function (c) { return { productId: c.productId, qty: c.qty || 1 }; });
      const idx = next.findIndex(function (c) { return c.productId === productId; });
      if (idx >= 0) {
        next[idx].qty = (next[idx].qty || 1) + delta;
        if (next[idx].qty <= 0) next.splice(idx, 1);
      } else if (delta > 0) {
        next.push({ productId: productId, qty: delta });
      }
      localCart = next;
      cartMirrorReady = true;
      syncCartActions();
      return;
    }

    if (window.AuraCart && typeof window.AuraCart.updateQtyById === 'function') {
      window.AuraCart.updateQtyById(productId, delta);
    }
    syncCartActions();
  }

  function addProduct(productId) {
    bumpQty(productId, 1);
  }

  function bindQtyControl(control) {
    if (!control || control.dataset.bound === '1') return;
    control.dataset.bound = '1';
    control.addEventListener('click', function (e) {
      e.stopPropagation();
      const btn = e.target.closest('button');
      if (!btn) return;
      const productId = control.dataset.productId;
      if (!productId) return;
      if (btn.classList.contains('qty-plus')) bumpQty(productId, 1);
      else if (btn.classList.contains('qty-minus')) bumpQty(productId, -1);
    });
  }

  function bindAddBtn(btn) {
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const idx = Number(btn.dataset.addIdx || 0);
      const p = images[idx];
      const productId = (p && p.productId) || (btn.closest('.col-item') && btn.closest('.col-item').dataset.id) || '';
      if (!productId) return;
      addProduct(productId);
    });
  }

  function setActionEl(host, productId, idx) {
    if (!host) return;
    const qty = getCartQty(productId);
    const html = qty > 0 ? qtyControlMarkup(productId, idx, qty) : addBtnMarkup(idx);
    const current = host.querySelector('.btn-qty-control, .btn-add-cart');
    if (current) {
      const isQty = current.classList.contains('btn-qty-control');
      if (qty > 0 && isQty) {
        const span = current.querySelector('.qty-value');
        if (span) span.textContent = String(qty);
        current.dataset.productId = productId;
        current.dataset.addIdx = String(idx);
        return;
      }
      if (qty <= 0 && current.classList.contains('btn-add-cart')) {
        current.dataset.addIdx = String(idx);
        return;
      }
      current.outerHTML = html;
    } else {
      host.insertAdjacentHTML('beforeend', html);
    }
    const next = host.querySelector('.btn-qty-control, .btn-add-cart');
    // Lightbox uses event delegation on .lightbox-info — avoid double handlers.
    if (host.classList.contains('lightbox-info')) return;
    if (next && next.classList.contains('btn-qty-control')) bindQtyControl(next);
    if (next && next.classList.contains('btn-add-cart')) bindAddBtn(next);
  }

  function syncCartActions() {
    document.querySelectorAll('.col-item').forEach(function (card) {
      const productId = card.dataset.id || '';
      const idx = Number(card.dataset.idx || 0);
      const host = card.querySelector('.col-item-info') || card;
      setActionEl(host, productId, idx);
    });

    if (lightbox) {
      const p = images[currentIndex];
      const lbHost = lightbox.querySelector('.lightbox-info');
      if (p && lbHost) setActionEl(lbHost, p.productId || '', currentIndex);
    }
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
          <img src="${escapeAttr(imgPath)}" alt="${escapeAttr(p.name)}" loading="lazy" decoding="async">
          <div class="col-item-zoom"><i class="fas fa-search-plus"></i></div>
        </div>
        <div class="col-item-info">
          <h3 class="col-item-title">${escapeAttr(p.name)}</h3>
          <p class="col-item-price">${formatInr(p.price)}</p>
          ${cartActionMarkup(p.id, idx)}
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
    syncCartActions();

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
        if (e.target.closest('.btn-qty-control') || e.target.closest('.btn-add-cart')) return;
        openLightbox(Number(item.dataset.idx || 0));
      });
    });
    document.querySelectorAll('.btn-add-cart').forEach(bindAddBtn);
    document.querySelectorAll('.btn-qty-control').forEach(bindQtyControl);
    syncCartActions();
  }

  function currentSlug() {
    const grid = document.querySelector('.col-grid');
    if (grid && grid.dataset.collection) return grid.dataset.collection;
    const file = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    return file || '';
  }

  async function hydrateFromApi() {
    if (!(window.AuraApi && typeof window.AuraApi.apiFetch === 'function')) return;
    const slug = currentSlug();
    if (!slug) return;
    let products;
    try {
      const res = await window.AuraApi.apiFetch('/api/products');
      products = Array.isArray(res.data) ? res.data : null;
    } catch (err) {
      return;
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
        <button type="button" class="btn-add-cart" id="lbAddToCartBtn" data-add-idx="0"><i class="fas fa-shopping-cart"></i> Add to cart</button>
      </div>
      <div class="lightbox-counter"></div>`;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-next').addEventListener('click', next);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', prev);

    // Delegate clicks inside lightbox info (add / qty swap dynamically)
    lightbox.querySelector('.lightbox-info').addEventListener('click', function (e) {
      e.stopPropagation();
      const addBtn = e.target.closest('.btn-add-cart');
      const qtyBtn = e.target.closest('.btn-qty-control button');
      const p = images[currentIndex];
      if (!p || !p.productId) return;
      if (addBtn) {
        addProduct(p.productId);
        return;
      }
      if (qtyBtn) {
        if (qtyBtn.classList.contains('qty-plus')) bumpQty(p.productId, 1);
        else if (qtyBtn.classList.contains('qty-minus')) bumpQty(p.productId, -1);
      }
    });

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
      } else if (e.data.type === 'cartUpdated') {
        localCart = Array.isArray(e.data.cart) ? e.data.cart.slice() : [];
        cartMirrorReady = true;
        syncCartActions();
      }
    });

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'requestCart' }, '*');
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) syncCartActions();
    });

    hydrateFromApi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
