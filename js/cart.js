(function () {
  let cart = JSON.parse(localStorage.getItem('aura_cart_v2') || '[]');
  let catalogCache = null;

  function saveCart() {
    localStorage.setItem('aura_cart_v2', JSON.stringify(cart));
  }

  function itemCount() {
    return cart.reduce((sum, i) => sum + (i.qty || 1), 0);
  }

  function updateBadge() {
    document.querySelectorAll('#navCartBadge, .nav-cart-badge').forEach(function (b) {
      b.textContent = itemCount();
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
    await renderCartPage();
    getOverlay().classList.add('active');
    document.body.style.overflow = 'hidden';
    if (window.location.hash !== '#cart') history.pushState({ auraOverlay: 'cart' }, '', '#cart');
  }

  function closeCartPage() {
    const overlay = document.getElementById('cartPageOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
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
    await openCartPage();
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
  });

  window.addEventListener('popstate', function () {
    if (window.location.hash !== '#cart') {
      const overlay = document.getElementById('cartPageOverlay');
      if (overlay) overlay.classList.remove('active');
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

  window.AuraCart = { addToCart, addToCartById, openCartPage, closeCartPage, updateQty, getItems: () => cart.slice() };
  window.addToCart = addToCart;
  window.openCartPage = openCartPage;
})();
