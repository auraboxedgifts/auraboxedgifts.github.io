(function () {
  let mapsLoaded = false;
  let mapsLoadPromise = null;

  function logMaps(step, detail) {
    console.log(`[AuraMaps] ${step}`, detail !== undefined ? detail : '');
  }

  function ensureMapsLoaded(apiKey) {
    if (!apiKey) {
      logMaps('skip', 'no API key from /api/config');
      return Promise.resolve(false);
    }
    if (mapsLoaded && window.google?.maps?.places) {
      return Promise.resolve(true);
    }
    if (mapsLoadPromise) return mapsLoadPromise;

    mapsLoadPromise = new Promise((resolve) => {
      const existing = document.getElementById('auraGoogleMapsPlacesScript');
      if (existing) {
        logMaps('reuse-script', existing.src);
        existing.addEventListener('load', () => {
          mapsLoaded = Boolean(window.google?.maps?.places);
          logMaps('loaded-existing', { ok: mapsLoaded });
          resolve(mapsLoaded);
        }, { once: true });
        existing.addEventListener('error', (e) => {
          logMaps('error-existing', e);
          resolve(false);
        }, { once: true });
        return;
      }

      const callbackName = '__auraMapsInit';
      window[callbackName] = function () {
        mapsLoaded = Boolean(window.google?.maps?.places);
        logMaps('callback', { ok: mapsLoaded, hasPlaces: Boolean(window.google?.maps?.places) });
        resolve(mapsLoaded);
      };

      const script = document.createElement('script');
      script.id = 'auraGoogleMapsPlacesScript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = (e) => {
        logMaps('script-error', e);
        resolve(false);
      };
      logMaps('inject-script', { keyPrefix: apiKey.slice(0, 6) });
      document.head.appendChild(script);
    });
    return mapsLoadPromise;
  }

  function initAddressAutocomplete(overlay) {
    const input = overlay.querySelector('#ckAddress');
    if (!input) {
      logMaps('autocomplete-skip', 'no #ckAddress');
      return;
    }
    if (!window.google?.maps?.places?.Autocomplete) {
      logMaps('autocomplete-skip', 'Autocomplete class unavailable');
      return;
    }
    try {
      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'in' },
        fields: ['address_components', 'formatted_address', 'geometry']
      });
      autocomplete.addListener('place_changed', function () {
        const place = autocomplete.getPlace();
        logMaps('place-selected', {
          hasPlace: Boolean(place),
          formatted: place?.formatted_address,
          components: place?.address_components?.length || 0
        });
        if (!place) return;
        if (place.formatted_address) input.value = place.formatted_address;
        if (!Array.isArray(place.address_components)) return;
        const city = overlay.querySelector('#ckCity');
        const state = overlay.querySelector('#ckState');
        const pincode = overlay.querySelector('#ckPincode');
        place.address_components.forEach((comp) => {
          const types = comp.types || [];
          if (types.includes('locality') && city) city.value = comp.long_name;
          if (types.includes('postal_town') && city && !city.value) city.value = comp.long_name;
          if (types.includes('administrative_area_level_1') && state) state.value = comp.long_name;
          if (types.includes('postal_code') && pincode) pincode.value = comp.long_name;
        });
      });
      logMaps('autocomplete-ready', 'bound to #ckAddress');
    } catch (err) {
      logMaps('autocomplete-error', err.message);
    }
  }

  function toggleManualAddressMode(overlay, manualMode) {
    const button = overlay.querySelector('#ckManualAddressBtn');
    const addressInput = overlay.querySelector('#ckAddress');
    if (!button || !addressInput) return;
    if (manualMode) {
      button.dataset.manual = 'true';
      button.textContent = 'Use automatic Google address search';
      addressInput.placeholder = 'Address (House no, building, street, area)';
      addressInput.removeAttribute('autocomplete');
    } else {
      button.dataset.manual = 'false';
      button.textContent = 'Enter address manually';
      addressInput.placeholder = 'Start typing your address…';
      addressInput.setAttribute('autocomplete', 'off');
    }
  }

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
    const w = document.getElementById('auraAIWidget');
    if (w) w.classList.add('aura-docked');
    const lineHtml = calc.data.lines.map((line) => `<div class="ck-order-line"><span>${line.name} x${line.qty}</span><span>₹${line.lineTotal}.00</span></div>`).join('');
    overlay.innerHTML = `
      <div class="checkout-page">
        <div class="ck-left">
          <h3>Checkout</h3>
          <p class="ck-secure-text" id="ckLoginHint">Login required before payment.</p>
          <div class="ck-field"><input type="text" id="ckName" placeholder="Full name"></div>
          <div class="ck-field"><input type="text" id="ckPhone" placeholder="Phone"></div>
          <div class="ck-field ck-address-field"><input type="text" id="ckAddress" placeholder="Start typing your address…" autocomplete="off"></div>
          <p class="ck-maps-hint" id="ckMapsHint" style="display:none;font-size:12px;color:#888;margin:0 0 8px;"></p>
          <button class="ck-back-btn" id="ckManualAddressBtn" style="margin:0 0 8px;">Enter address manually</button>
          <div class="ck-row ck-row-3">
            <div class="ck-field"><input type="text" id="ckCity" placeholder="City"></div>
            <div class="ck-field"><input type="text" id="ckState" placeholder="State"></div>
            <div class="ck-field"><input type="text" id="ckPincode" placeholder="PIN code"></div>
          </div>
          <label class="ck-checkbox"><input type="checkbox" id="ckSaveInfo"> Save this information for next checkout</label>
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
    const loginHint = overlay.querySelector('#ckLoginHint');
    const mapsHint = overlay.querySelector('#ckMapsHint');
    const meAtLoad = await AuraAuth.refreshUser();
    if (meAtLoad) {
      loginBtn.style.display = 'none';
      loginHint.textContent = `Logged in as ${meAtLoad.email}`;
      const profile = meAtLoad.checkoutInfo || {};
      if (profile.name) overlay.querySelector('#ckName').value = profile.name;
      if (profile.phone) overlay.querySelector('#ckPhone').value = profile.phone;
      if (profile.address) overlay.querySelector('#ckAddress').value = profile.address;
      if (profile.city) overlay.querySelector('#ckCity').value = profile.city;
      if (profile.state) overlay.querySelector('#ckState').value = profile.state;
      if (profile.pincode) overlay.querySelector('#ckPincode').value = profile.pincode;
      if (profile.name || profile.phone || profile.address) {
        overlay.querySelector('#ckSaveInfo').checked = true;
      }
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
    overlay.querySelector('#ckManualAddressBtn').addEventListener('click', function () {
      const manualMode = this.dataset.manual !== 'true';
      toggleManualAddressMode(overlay, manualMode);
      const current = overlay.querySelector('#ckAddress');
      if (current) current.focus();
    });
    toggleManualAddressMode(overlay, false);

    try {
      const cfg = await AuraApi.apiFetch('/api/config');
      const key = cfg?.data?.googleMapsApiKey || cfg?.googleMapsApiKey || '';
      logMaps('config', { hasKey: Boolean(key), mapsEnabled: cfg?.data?.mapsEnabled });
      if (!key) {
        mapsHint.style.display = '';
        mapsHint.textContent = 'Address search unavailable (no Maps key on server). Use manual entry.';
      } else {
        const ok = await ensureMapsLoaded(key);
        if (ok) {
          initAddressAutocomplete(overlay);
          mapsHint.style.display = '';
          mapsHint.textContent = 'Type at least 3 characters to search your address.';
        } else {
          mapsHint.style.display = '';
          mapsHint.textContent = 'Google Maps failed to load. Check browser console [AuraMaps] logs and API key restrictions.';
        }
      }
    } catch (err) {
      logMaps('config-error', err.message);
      mapsHint.style.display = '';
      mapsHint.textContent = `Could not load maps config: ${err.message}`;
    }

    overlay.querySelector('#ckPayNowBtn').addEventListener('click', async function () {
      const me = await AuraAuth.refreshUser();
      if (!me) return AuraAuth.openAuthModal();
      const customer = {
        name: document.getElementById('ckName').value.trim(),
        email: me.email,
        phone: document.getElementById('ckPhone').value.trim(),
        address: document.getElementById('ckAddress').value.trim()
      };
      const city = document.getElementById('ckCity').value.trim();
      const state = document.getElementById('ckState').value.trim();
      const pincode = document.getElementById('ckPincode').value.trim();
      if (!customer.name || !customer.phone || !customer.address) {
        alert('Please fill full name, phone and address');
        return;
      }
      if (overlay.querySelector('#ckSaveInfo').checked) {
        await AuraApi.apiFetch('/api/auth/checkout-info', {
          method: 'PUT',
          body: JSON.stringify({
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            city,
            state,
            pincode
          })
        });
      }
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
          overlay.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;"><div><h2>Order Confirmed</h2><p>Thanks for shopping with Aura Boxed Gifts.</p><button class="cart-page-shop-btn" onclick="const w=document.getElementById('auraAIWidget'); if(w)w.classList.remove('aura-docked'); this.closest('.checkout-page-overlay').remove()">Continue shopping</button></div></div>`;
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
    const w = document.getElementById('auraAIWidget');
    if (w) w.classList.remove('aura-docked');
    if (window.location.hash === '#checkout') history.back();
  }

  window.addEventListener('popstate', function () {
    if (window.location.hash !== '#checkout') {
      const overlay = document.getElementById('checkoutPageOverlay');
      if (overlay) overlay.remove();
      const w = document.getElementById('auraAIWidget');
      if (w) w.classList.remove('aura-docked');
    }
  });

  window.AuraCheckout = { openCheckoutPage, closeCheckout };
  window.openCheckoutPage = openCheckoutPage;
})();
