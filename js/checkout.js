(function () {
  async function openCheckoutPage() {
    const items = AuraCart.getItems();
    const calc = await AuraApi.apiFetch('/api/cart/calculate', {
      method: 'POST',
      body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, qty: i.qty })) })
    });

    let existing = document.getElementById('checkoutPageOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'checkoutPageOverlay';
    overlay.className = 'checkout-page-overlay active';
    const lineHtml = calc.data.lines.map((line) => `<div class="ck-order-line"><span>${line.name} x${line.qty}</span><span>₹${line.lineTotal}.00</span></div>`).join('');
    overlay.innerHTML = `
      <div class="checkout-page">
        <div class="ck-left">
          <h3>Checkout</h3>
          <p class="ck-secure-text">Login required before payment.</p>
          <div class="ck-field"><input type="text" id="ckName" placeholder="Full name"></div>
          <div class="ck-field"><input type="text" id="ckPhone" placeholder="Phone"></div>
          <div class="ck-field"><input type="text" id="ckAddress" placeholder="Address"></div>
          <button class="ck-pay-now-btn" id="ckLoginBtn">Login / Verify OTP</button>
          <button class="ck-pay-now-btn" id="ckPayNowBtn" style="margin-top:10px;">Pay now • ₹${calc.data.grandTotal}.00</button>
          <button class="ck-back-btn" id="ckBackBtn" style="margin-top:8px;">Back to cart</button>
        </div>
        <div class="ck-right">
          <button class="ck-summary-toggle" id="ckSummaryToggle" type="button">Order Summary <span>▼</span></button>
          <h3>Order Summary</h3>
          <div class="ck-order-totals" id="ckOrderSummaryBody">${lineHtml}</div>
          <hr>
          <div class="ck-order-line ck-order-summary-line"><span>Subtotal</span><span>₹${calc.data.subtotal}.00</span></div>
          <div class="ck-order-line ck-order-summary-line"><span>Shipping</span><span>₹${calc.data.shipping}.00</span></div>
          <div class="ck-order-line ck-order-grand"><span>Total</span><span>₹${calc.data.grandTotal}.00</span></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    if (window.location.hash !== '#checkout') history.pushState({ auraOverlay: 'checkout' }, '', '#checkout');

    const loginBtn = overlay.querySelector('#ckLoginBtn');
    const meAtLoad = await AuraAuth.refreshUser();
    if (meAtLoad) {
      loginBtn.style.display = 'none';
    } else {
      loginBtn.style.display = '';
    }

    overlay.querySelector('#ckBackBtn').addEventListener('click', function () {
      closeCheckout();
      AuraCart.openCartPage();
    });
    overlay.querySelector('#ckSummaryToggle').addEventListener('click', function () {
      const body = overlay.querySelector('#ckOrderSummaryBody');
      body.classList.toggle('is-open');
      this.classList.toggle('is-open');
    });
    loginBtn.addEventListener('click', function () {
      AuraAuth.openAuthModal();
    });
    overlay.querySelector('#ckPayNowBtn').addEventListener('click', async function () {
      const me = await AuraAuth.refreshUser();
      if (!me) return AuraAuth.openAuthModal();
      const customer = {
        name: document.getElementById('ckName').value.trim(),
        email: me.email,
        phone: document.getElementById('ckPhone').value.trim(),
        address: document.getElementById('ckAddress').value.trim()
      };
      if (!customer.name || !customer.phone || !customer.address) return;
      const orderResp = await AuraApi.apiFetch('/api/create-order', { method: 'POST', body: JSON.stringify({ items }) });
      const options = {
        key: orderResp.key_id,
        amount: orderResp.order.amount,
        currency: 'INR',
        name: 'Aura Boxed Gifts',
        order_id: orderResp.order.id,
        prefill: { name: customer.name, email: customer.email, contact: customer.phone },
        handler: async function (resp) {
          await AuraApi.apiFetch('/api/verify-payment', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              cartItems: items,
              customer
            })
          });
          localStorage.setItem('aura_cart_v2', '[]');
          overlay.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;"><div><h2>Order Confirmed</h2><p>Thanks for shopping with Aura Boxed Gifts.</p><button class="cart-page-shop-btn" onclick="this.closest('.checkout-page-overlay').remove()">Continue shopping</button></div></div>`;
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  }

  function closeCheckout() {
    const overlay = document.getElementById('checkoutPageOverlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
    if (window.location.hash === '#checkout') history.back();
  }

  window.addEventListener('popstate', function () {
    if (window.location.hash !== '#checkout') {
      const overlay = document.getElementById('checkoutPageOverlay');
      if (overlay) overlay.remove();
    }
  });

  window.AuraCheckout = { openCheckoutPage, closeCheckout };
  window.openCheckoutPage = openCheckoutPage;
})();
