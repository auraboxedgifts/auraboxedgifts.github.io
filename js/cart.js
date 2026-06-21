(function () {
  let cart = JSON.parse(localStorage.getItem('aura_cart_v2') || '[]');
  let catalogCache = null;
  // Cart no longer pops open on every add. We count individual adds and only
  // auto-open the cart once this reaches the threshold, then reset.
  const AUTO_OPEN_THRESHOLD = 12;
  let addsSinceOpen = 0;

  function saveCart() {
    localStorage.setItem('aura_cart_v2', JSON.stringify(cart));
    broadcastCartUpdate();
  }

  function broadcastCartUpdate() {
    document.querySelectorAll('iframe').forEach((iframe) => {
      try {
        iframe.contentWindow.postMessage({
          type: 'cartUpdated',
          cart: cart
        }, '*');
      } catch (e) {}
    });
  }

  function updateQtyById(productId, delta) {
    const idx = cart.findIndex(c => c.productId === productId);
    if (idx >= 0) {
      cart[idx].qty = (cart[idx].qty || 1) + delta;
      if (cart[idx].qty <= 0) {
        cart.splice(idx, 1);
      }
    } else if (delta > 0) {
      cart.push({ productId, qty: delta });
    }
    saveCart();
    updateBadge();
    const overlay = document.getElementById('cartPageOverlay');
    if (overlay && overlay.classList.contains('active')) {
      renderCartPage();
    }
    showCartToastForProduct(productId);
  }

  let toastTimer = null;
  async function showCartToastForProduct(productId) {
    let toast = document.getElementById('auraCartToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'auraCartToast';
      toast.className = 'aura-cart-toast';
      toast.addEventListener('click', function (e) {
        if (!e.target.closest('.toast-qty-btn')) {
          openCartPage();
        }
      });
      document.body.appendChild(toast);
    }

    const products = await ensureCatalog();

    const itemInCart = cart.find(c => c.productId === productId);
    if (!itemInCart || itemInCart.qty <= 0) {
      toast.classList.remove('show');
      return;
    }
    let productName = 'Item';
    if (products) {
      const p = products.find(x => x.id === productId);
      if (p) productName = p.name;
    }
    if (productName === 'Item') {
      try {
        const siteRes = await AuraApi.apiFetch('/api/site');
        const hampers = (siteRes.data && siteRes.data.hampers) || [];
        const h = hampers.find(x => x.id === productId);
        if (h) productName = h.title;
      } catch (err) {}
    }

    toast.innerHTML = `
      <div class="aura-cart-toast-body" style="width: 100%;">
        <div class="aura-cart-toast-title"><i class="fas fa-circle-check"></i> Added to your cart</div>
        <div class="aura-cart-toast-row">
          <span class="aura-cart-toast-name" title="${productName}">${productName}</span>
          <div class="aura-cart-toast-control">
            <button class="toast-qty-btn minus" data-id="${productId}">-</button>
            <span class="toast-qty-val">${itemInCart.qty}</span>
            <button class="toast-qty-btn plus" data-id="${productId}">+</button>
          </div>
        </div>
      </div>
    `;

    const minusBtn = toast.querySelector('.toast-qty-btn.minus');
    const plusBtn = toast.querySelector('.toast-qty-btn.plus');

    minusBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      updateQtyById(productId, -1);
    });

    plusBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      updateQtyById(productId, 1);
    });

    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 6000);
  }

  function itemCount() {
    return cart.reduce((sum, i) => sum + (i.qty || 1), 0);
  }

  function updateBadge() {
    const count = itemCount();
    document.querySelectorAll('#navCartBadge, .nav-cart-badge').forEach(function (b) {
      if (count > 0) {
        b.textContent = count;
        b.style.display = 'flex';
        // Bounce animation
        b.classList.remove('bounce');
        void b.offsetWidth;
        b.classList.add('bounce');
        setTimeout(function () { b.classList.remove('bounce'); }, 600);
      } else {
        b.style.display = 'none';
      }
    });
  }

  async function ensureCatalog() {
    if (catalogCache) return catalogCache;
    try {
      const res = await AuraApi.apiFetch('/api/products');
      catalogCache = Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      catalogCache = [];
    }
    return catalogCache;
  }

  function resolveProductIdFromLegacyPayload(item, products) {
    if (item.productId) return item.productId;
    if (!products || !products.length) return null;
    if (item.item && item.price) {
      const exact = products.find((p) => p.name === item.item && Number(p.price) === Number(item.price));
      if (exact) return exact.id;
    }
    if (item.item) {
      const byName = products.find((p) => p.name === item.item);
      if (byName) return byName.id;
    }
    return null;
  }

  function getOverlay() {
    let el = document.getElementById('cartPageOverlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'cartPageOverlay';
    el.className = 'cart-page-overlay';
    el.innerHTML = `
      <div class="cart-page">
        <header class="cart-page-header">
          <h1>Your cart</h1>
          <a href="#" class="cart-continue-link" id="cartCloseLink">Continue shopping</a>
        </header>
        <div class="cart-page-body" id="cartPageBody"></div>
        <footer class="cart-page-footer" id="cartPageFooter">
          <div class="cart-page-total"><span>Estimated total</span><span id="cartPageTotalAmt">Rs. 0.00</span></div>
          <p class="cart-page-tax">Shipping and total are calculated by server.</p>
          <button class="cart-page-checkout-btn" id="cartPageCheckoutBtn">Check out</button>
        </footer>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('#cartCloseLink').addEventListener('click', function (e) { e.preventDefault(); closeCartPage(); });
    el.querySelector('#cartPageCheckoutBtn').addEventListener('click', function () { AuraCheckout.openCheckoutPage(); });
    return el;
  }

  async function renderCartPage() {
    const overlay = getOverlay();
    const body = overlay.querySelector('#cartPageBody');
    const footer = overlay.querySelector('#cartPageFooter');
    const totalEl = overlay.querySelector('#cartPageTotalAmt');
    if (!cart.length) {
      body.innerHTML = '<div class="cart-page-empty"><h2>Your cart is empty</h2></div>';
      footer.style.display = 'none';
      return;
    }
    const calc = await AuraApi.apiFetch('/api/cart/calculate', { method: 'POST', body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, qty: i.qty })) }) });
    footer.style.display = '';
    const lines = calc.data.lines.map(function (line, idx) {
      return `<tr class="cart-table-row">
        <td class="cart-td-img"><img src="${AuraApi.resolveAssetPath(line.image || '')}" alt="${line.name}"></td>
        <td class="cart-td-info"><div class="cart-td-name">${line.name}</div><div class="cart-td-price">Rs. ${line.unitPrice}.00</div></td>
        <td class="cart-td-qty"><div class="qty-control"><button onclick="AuraCart.updateQty(${idx},-1)">−</button><span>${line.qty}</span><button onclick="AuraCart.updateQty(${idx},1)">+</button></div></td>
        <td class="cart-td-total">Rs. ${line.lineTotal}.00</td>
      </tr>`;
    }).join('');
    body.innerHTML = `<table class="cart-table"><thead><tr><th colspan="2">Product</th><th>Qty</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>
      <div style="margin-top:14px;text-align:right;color:#333;font-size:14px;">Subtotal: Rs. ${calc.data.subtotal}.00 | Shipping: Rs. ${calc.data.shipping}.00</div>`;
    totalEl.textContent = `Rs. ${calc.data.grandTotal}.00`;
    updateBadge();
  }

  async function openCartPage() {
    addsSinceOpen = 0;
    await renderCartPage();
    getOverlay().classList.add('active');
    document.body.style.overflow = 'hidden';
    const w = document.getElementById('auraAIWidget');
    if (w) w.classList.add('aura-docked');
    if (window.location.hash !== '#cart') history.pushState({ auraOverlay: 'cart' }, '', '#cart');
  }

  function closeCartPage() {
    const overlay = document.getElementById('cartPageOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    const w = document.getElementById('auraAIWidget');
    if (w) w.classList.remove('aura-docked');
    if (window.location.hash === '#cart') history.back();
  }

  async function addToCart(item) {
    const products = await ensureCatalog();
    const productId = resolveProductIdFromLegacyPayload(item || {}, products);
    if (!productId) return;
    const existingIdx = cart.findIndex(c => c.productId === productId);
    if (existingIdx >= 0) cart[existingIdx].qty = (cart[existingIdx].qty || 1) + 1;
    else cart.push({ productId, qty: 1 });
    saveCart();
    updateBadge();

    addsSinceOpen += 1;
    if (addsSinceOpen >= AUTO_OPEN_THRESHOLD) {
      addsSinceOpen = 0;
      await openCartPage();
    } else {
      showCartToastForProduct(productId);
    }
  }

  async function addToCartById(productId) {
    return addToCart({ productId });
  }

  async function updateQty(index, delta) {
    if (!cart[index]) return;
    cart[index].qty = (cart[index].qty || 1) + delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    await renderCartPage();
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'addToCart') addToCart(e.data);
    if (e.data && e.data.type === 'openCart') openCartPage();
    if (e.data && e.data.type === 'updateQtyById') {
      updateQtyById(e.data.productId, e.data.delta);
    }
    // Cross-origin iframe requests current cart state on init
    if (e.data && e.data.type === 'requestCart') {
      document.querySelectorAll('iframe').forEach(function (iframe) {
        try {
          iframe.contentWindow.postMessage({ type: 'cartUpdated', cart: cart }, '*');
        } catch (err) {}
      });
    }
    // Cross-origin iframe requests parent badge bounce
    if (e.data && e.data.type === 'bounceBadge') {
      updateBadge();
    }
  });

  window.addEventListener('popstate', function () {
    if (window.location.hash !== '#cart') {
      const overlay = document.getElementById('cartPageOverlay');
      if (overlay) overlay.classList.remove('active');
      const w = document.getElementById('auraAIWidget');
      if (w) w.classList.remove('aura-docked');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    const icon = document.getElementById('navCartIcon');
    if (icon) {
      icon.addEventListener('click', function (e) {
        e.preventDefault();
        if (window.parent !== window) window.parent.postMessage({ type: 'openCart' }, '*');
        else openCartPage();
      });
    }
    updateBadge();
  });

  window.AuraCart = { addToCart, addToCartById, openCartPage, closeCartPage, updateQty, updateQtyById, getItems: () => cart.slice() };
  window.addToCart = addToCart;
  window.openCartPage = openCartPage;
})();
