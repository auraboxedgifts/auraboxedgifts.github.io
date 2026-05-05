// ═══ Aura Boxed Gifts — Cart & Checkout System ═══
// Full-page cart, BoldPetals-style checkout with address, Razorpay

let cart = JSON.parse(localStorage.getItem('aura_cart')) || [];
const API_BASE = 'https://aura.devshubh.me';

function saveCart() { localStorage.setItem('aura_cart', JSON.stringify(cart)); }
function getTotalItems() { return cart.reduce(function(s,i){ return s+(i.qty||1); },0); }
function getTotalPrice() { return cart.reduce(function(s,i){ return s+i.price*(i.qty||1); },0); }
function updateBadge() {
    document.querySelectorAll('#navCartBadge, .nav-cart-badge').forEach(function(b){ b.textContent = getTotalItems(); });
}

// ─── CART PAGE OVERLAY ───
function getCartOverlay() {
    var el = document.getElementById('cartPageOverlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'cartPageOverlay';
    el.className = 'cart-page-overlay';
    el.innerHTML =
    '<div class="cart-page">' +
      '<header class="cart-page-header"><h1>Your cart</h1>' +
        '<a href="#" class="cart-continue-link" onclick="closeCartPage(); return false;">Continue shopping</a>' +
      '</header>' +
      '<div class="cart-page-body" id="cartPageBody"></div>' +
      '<footer class="cart-page-footer" id="cartPageFooter">' +
        '<div class="cart-page-total"><span>Estimated total</span><span id="cartPageTotalAmt">Rs. 0.00</span></div>' +
        '<p class="cart-page-tax">Taxes, discounts and shipping calculated at checkout.</p>' +
        '<button class="cart-page-checkout-btn" id="cartPageCheckoutBtn">Check out</button>' +
      '</footer>' +
    '</div>';
    document.body.appendChild(el);
    el.querySelector('#cartPageCheckoutBtn').addEventListener('click', openCheckoutPage);
    return el;
}

function renderCartPage() {
    var overlay = getCartOverlay();
    var body = overlay.querySelector('#cartPageBody');
    var footer = overlay.querySelector('#cartPageFooter');
    var totalEl = overlay.querySelector('#cartPageTotalAmt');

    if (cart.length === 0) {
        body.innerHTML = '<div class="cart-page-empty"><h2>Your cart is empty</h2><p>Continue shopping to find something you love.</p><button class="cart-page-shop-btn" onclick="closeCartPage()">Continue shopping</button></div>';
        footer.style.display = 'none';
    } else {
        footer.style.display = '';
        var html = '<table class="cart-table"><thead><tr><th colspan="2">Product</th><th>Quantity</th><th>Total</th></tr></thead><tbody>';
        cart.forEach(function(item, idx) {
            var qty = item.qty || 1;
            html += '<tr class="cart-table-row">' +
              '<td class="cart-td-img"><img src="'+(item.img||'')+'" alt="'+item.item+'"></td>' +
              '<td class="cart-td-info"><div class="cart-td-name">'+item.item+'</div><div class="cart-td-price">Rs. '+item.price+'.00</div></td>' +
              '<td class="cart-td-qty"><div class="qty-control"><button onclick="updateQty('+idx+',-1)">−</button><span>'+qty+'</span><button onclick="updateQty('+idx+',1)">+</button></div><button class="cart-td-remove" onclick="removeFromCart('+idx+')"><i class="fas fa-trash-alt"></i></button></td>' +
              '<td class="cart-td-total">Rs. '+(item.price*qty)+'.00</td>' +
            '</tr>';
        });
        html += '</tbody></table>';
        body.innerHTML = html;
    }
    if (totalEl) totalEl.textContent = 'Rs. ' + getTotalPrice() + '.00';
    updateBadge();
}

function openCartPage() {
    renderCartPage();
    getCartOverlay().classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeCartPage() {
    var o = document.getElementById('cartPageOverlay');
    if (o) { o.classList.remove('active'); document.body.style.overflow = ''; }
}

// ─── FULL CHECKOUT PAGE (BoldPetals-inspired) ───
function openCheckoutPage() {
    closeCartPage();
    var existing = document.getElementById('checkoutPageOverlay');
    if (existing) existing.remove();

    var total = getTotalPrice();
    var shipping = 70;
    var grandTotal = total + shipping;

    // Build order summary items
    var itemsHtml = '';
    cart.forEach(function(item) {
        var qty = item.qty || 1;
        itemsHtml += '<div class="ck-order-item">' +
            '<div class="ck-order-img-wrap"><img src="'+(item.img||'')+'" alt="'+item.item+'"><span class="ck-order-qty-badge">'+qty+'</span></div>' +
            '<div class="ck-order-item-name">'+item.item+'</div>' +
            '<div class="ck-order-item-price">₹'+( item.price * qty )+'.00</div>' +
        '</div>';
    });

    var el = document.createElement('div');
    el.id = 'checkoutPageOverlay';
    el.className = 'checkout-page-overlay active';
    el.innerHTML =
    '<div class="checkout-page">' +
      '<div class="ck-left">' +
        '<div class="ck-brand"><img src="images/logo.jpeg" alt="Aura" class="ck-logo"><span>Aura Boxed Gifts</span></div>' +

        '<!-- STEP 1: CONTACT -->' +
        '<section class="ck-section" id="stepContact">' +
          '<h3>Contact</h3>' +
          '<div id="ckOtpForm">' +
            '<div class="ck-field"><input type="email" id="ckEmail" placeholder="Email" required></div>' +
            '<button class="ck-pay-now-btn" id="ckSendOtpBtn" style="padding: 12px; margin-top: 5px;">Send OTP</button>' +
          '</div>' +
          '<div id="ckOtpVerifyForm" style="display: none;">' +
            '<p style="font-size: 0.8rem; margin-bottom: 10px;">OTP sent to <span id="ckEmailDisplay"></span> <a href="#" id="ckEditEmail" style="color:var(--rose-gold)">Edit</a></p>' +
            '<div class="ck-field"><input type="text" id="ckOtpInput" placeholder="Enter 6-digit OTP" required></div>' +
            '<button class="ck-pay-now-btn" id="ckVerifyOtpBtn" style="padding: 12px; margin-top: 5px;">Verify OTP</button>' +
          '</div>' +
          '<div id="ckContactSuccess" style="display: none; color: #27ae60; font-weight: 500; align-items: center; gap: 8px;"><i class="fas fa-check-circle"></i> <span id="ckVerifiedEmailText"></span></div>' +
        '</section>' +

        '<!-- STEP 2: DELIVERY -->' +
        '<section class="ck-section" id="stepDelivery" style="opacity: 0.4; pointer-events: none;">' +
          '<h3>Delivery</h3>' +
          '<div class="ck-field"><label>Country/Region</label><select id="ckCountry"><option>India</option></select></div>' +
          '<div class="ck-row">' +
            '<div class="ck-field ck-half"><input type="text" id="ckFirstName" placeholder="First name"></div>' +
            '<div class="ck-field ck-half"><input type="text" id="ckLastName" placeholder="Last name"></div>' +
          '</div>' +
          '<div class="ck-field"><input type="text" id="ckAddress" placeholder="Address (Start typing for suggestions...)"></div>' +
          '<div class="ck-field"><input type="text" id="ckApartment" placeholder="Apartment, suite, etc. (optional)"></div>' +
          '<div class="ck-row ck-row-3">' +
            '<div class="ck-field"><input type="text" id="ckCity" placeholder="City"></div>' +
            '<div class="ck-field"><input type="text" id="ckState" placeholder="State"></div>' +
            '<div class="ck-field"><input type="text" id="ckPincode" placeholder="PIN code"></div>' +
          '</div>' +
          '<div class="ck-field"><input type="tel" id="ckPhone" placeholder="Phone"></div>' +
          '<button class="ck-pay-now-btn" id="ckDeliveryBtn" style="padding: 12px; margin-top: 10px;">Continue to Shipping</button>' +
        '</section>' +

        '<!-- STEP 3: SHIPPING -->' +
        '<section class="ck-section" id="stepShipping" style="opacity: 0.4; pointer-events: none;">' +
          '<h3>Shipping method</h3>' +
          '<div class="ck-shipping-options">' +
            '<label class="ck-shipping-option selected"><input type="radio" name="shipping" value="standard" checked><div><strong>Standard</strong><span>10 to 12 business days • Delivery all over India</span></div><span class="ck-ship-price">₹70.00</span></label>' +
          '</div>' +
          '<button class="ck-pay-now-btn" id="ckShippingBtn" style="padding: 12px; margin-top: 15px;">Continue to Payment</button>' +
        '</section>' +

        '<!-- STEP 4: PAYMENT -->' +
        '<section class="ck-section" id="stepPayment" style="opacity: 0.4; pointer-events: none;">' +
          '<h3>Payment</h3>' +
          '<p class="ck-secure-text"><i class="fas fa-lock"></i> All transactions are secure and encrypted.</p>' +
          '<div class="ck-payment-box">' +
            '<div class="ck-payment-header"><span>Razorpay Secure (UPI, Cards, Int\'l Cards, Wallets)</span><span class="ck-pay-icons">💳</span></div>' +
            '<p class="ck-payment-desc">You\'ll be redirected to Razorpay Secure to complete your purchase.</p>' +
          '</div>' +
          '<button class="ck-pay-now-btn" id="ckPayNowBtn">Pay now • ₹'+grandTotal+'.00</button>' +
        '</section>' +
      '</div>' +

      '<div class="ck-right">' +
        '<button class="ck-back-btn" onclick="document.getElementById(\'checkoutPageOverlay\').remove(); openCartPage();">← Back to cart</button>' +
        '<div class="ck-order-summary">' +
          '<div class="ck-order-items">'+itemsHtml+'</div>' +
          '<div class="ck-order-totals">' +
            '<div class="ck-order-line"><span>Subtotal</span><span>₹'+total+'.00</span></div>' +
            '<div class="ck-order-line"><span>Shipping</span><span>₹'+shipping+'.00</span></div>' +
            '<div class="ck-order-line ck-order-grand"><span>Total</span><span><small>INR</small> ₹'+grandTotal+'.00</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';

    // Google Maps Autocomplete Init (Dynamic)
    fetch(API_BASE + '/api/config')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.googleMapsApiKey) {
                var script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=' + data.googleMapsApiKey + '&libraries=places';
                script.async = true;
                script.onload = function() {
                    if (window.google && window.google.maps && window.google.maps.places) {
                        var input = document.getElementById('ckAddress');
                        var autocomplete = new window.google.maps.places.Autocomplete(input, { types: ['address'], componentRestrictions: { country: 'in' } });
                        autocomplete.addListener('place_changed', function() {
                            var place = autocomplete.getPlace();
                            if (!place.address_components) return;
                            var city='', state='', pin='';
                            place.address_components.forEach(function(c) {
                                if(c.types.includes('locality')) city = c.long_name;
                                if(c.types.includes('administrative_area_level_1')) state = c.long_name;
                                if(c.types.includes('postal_code')) pin = c.long_name;
                            });
                            if(city) document.getElementById('ckCity').value = city;
                            if(state) document.getElementById('ckState').value = state;
                            if(pin) document.getElementById('ckPincode').value = pin;
                        });
                    }
                };
                document.head.appendChild(script);
            }
        })
        .catch(err => console.error('Config fetch error:', err));

    // OTP Logic
    var verifiedEmail = '';
    document.getElementById('ckSendOtpBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        var em = document.getElementById('ckEmail').value;
        if(!em) return alert('Please enter email');
        this.textContent = 'Sending...'; this.disabled = true;
        try {
            var res = await fetch(API_BASE + '/api/send-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: em}) });
            var data = await res.json();
            if(data.success) {
                document.getElementById('ckOtpForm').style.display = 'none';
                document.getElementById('ckEmailDisplay').textContent = em;
                document.getElementById('ckOtpVerifyForm').style.display = 'block';
            } else { alert(data.error || 'Failed to send OTP'); }
        } catch(e) { alert('Error: ' + e.message); }
        this.textContent = 'Send OTP'; this.disabled = false;
    });

    document.getElementById('ckEditEmail').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('ckOtpVerifyForm').style.display = 'none';
        document.getElementById('ckOtpForm').style.display = 'block';
    });

    document.getElementById('ckVerifyOtpBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        var em = document.getElementById('ckEmail').value;
        var otp = document.getElementById('ckOtpInput').value;
        if(!otp) return alert('Please enter OTP');
        this.textContent = 'Verifying...'; this.disabled = true;
        try {
            var res = await fetch(API_BASE + '/api/verify-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: em, otp: otp}) });
            var data = await res.json();
            if(data.success) {
                verifiedEmail = em;
                document.getElementById('ckOtpVerifyForm').style.display = 'none';
                document.getElementById('ckVerifiedEmailText').textContent = em;
                document.getElementById('ckContactSuccess').style.display = 'flex';
                document.getElementById('stepDelivery').style.opacity = '1';
                document.getElementById('stepDelivery').style.pointerEvents = 'auto';
            } else { alert(data.error || 'Invalid OTP'); }
        } catch(e) { alert('Error: ' + e.message); }
        this.textContent = 'Verify OTP'; this.disabled = false;
    });

    // Stepper logic
    document.getElementById('ckDeliveryBtn').addEventListener('click', function(e) {
        e.preventDefault();
        if(!document.getElementById('ckFirstName').value || !document.getElementById('ckAddress').value || !document.getElementById('ckCity').value || !document.getElementById('ckPhone').value) {
            return alert('Please fill in required delivery fields.');
        }
        document.getElementById('stepShipping').style.opacity = '1';
        document.getElementById('stepShipping').style.pointerEvents = 'auto';
        this.style.display = 'none'; // hide continue btn
    });

    document.getElementById('ckShippingBtn').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('stepPayment').style.opacity = '1';
        document.getElementById('stepPayment').style.pointerEvents = 'auto';
        this.style.display = 'none'; // hide continue btn
    });

    // Pay now logic
    document.getElementById('ckPayNowBtn').addEventListener('click', function(e) {
        e.preventDefault();
        var firstName = document.getElementById('ckFirstName').value;
        var lastName = document.getElementById('ckLastName').value;
        var address = document.getElementById('ckAddress').value;
        var city = document.getElementById('ckCity').value;
        var state = document.getElementById('ckState').value;
        var pincode = document.getElementById('ckPincode').value;
        var phone = document.getElementById('ckPhone').value;

        if (!verifiedEmail || !firstName || !address || !city || !phone) {
            alert('Please complete all steps.');
            return;
        }

        var fullName = firstName + ' ' + lastName;
        var fullAddress = address + ', ' + city + ', ' + state + ' ' + pincode;
        processPayment(fullName, verifiedEmail, phone, fullAddress, grandTotal);
    });
}

async function processPayment(name, email, phone, address, grandTotal) {
    var payBtn = document.getElementById('ckPayNowBtn');
    if (payBtn) { payBtn.textContent = 'Processing...'; payBtn.disabled = true; }

    try {
        var response = await fetch(API_BASE + '/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: grandTotal })
        });
        var data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to create order.');

        // Close checkout overlay before Razorpay opens
        var ckOv = document.getElementById('checkoutPageOverlay');
        if (ckOv) { ckOv.remove(); document.body.style.overflow = ''; }

        var options = {
            key: data.key_id,
            amount: data.order.amount,
            currency: "INR",
            name: "Aura Boxed Gifts",
            description: "Purchase from Aura Boxed Gifts",
            image: "https://auraboxedgifts.in/images/logo.jpeg",
            order_id: data.order.id,
            handler: async function(resp) {
                var verifyRes = await fetch(API_BASE + '/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: resp.razorpay_order_id,
                        razorpay_payment_id: resp.razorpay_payment_id,
                        razorpay_signature: resp.razorpay_signature,
                        cartDetails: cart,
                        customer: { name: name, email: email, phone: phone, address: address }
                    })
                });
                var vd = await verifyRes.json();
                if (vd.success) {
                    cart = []; saveCart(); updateBadge();
                    showOrderSuccess();
                } else { alert("Payment verification failed."); }
            },
            prefill: { name: name, email: email, contact: phone },
            theme: { color: "#b76e79" }
        };
        var rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function(r){ alert("Payment Failed: " + r.error.description); });
        rzp.open();
    } catch (err) {
        console.error(err); alert(err.message);
        if (payBtn) { payBtn.textContent = 'Pay now'; payBtn.disabled = false; }
    }
}

function showOrderSuccess() {
    var el = document.createElement('div');
    el.className = 'checkout-page-overlay active';
    el.style.background = 'var(--white, #fff)';
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;">' +
        '<div><div style="font-size:4rem;margin-bottom:20px;">🎉</div>' +
        '<h1 style="font-size:2rem;margin-bottom:12px;color:#27ae60;">Order Confirmed!</h1>' +
        '<p style="color:#666;font-size:1rem;margin-bottom:24px;max-width:400px;">Thank you for your purchase! We\'ll send you a confirmation email shortly.</p>' +
        '<button class="cart-page-shop-btn" onclick="this.closest(\'.checkout-page-overlay\').remove()">Continue shopping</button></div></div>';
    document.body.appendChild(el);
}

// ─── CART ACTIONS ───
function addToCart(itemObj) {
    var existing = cart.findIndex(function(c){ return c.item === itemObj.item && c.price === itemObj.price; });
    if (existing >= 0) { cart[existing].qty = (cart[existing].qty || 1) + 1; }
    else { itemObj.qty = 1; cart.push(itemObj); }
    saveCart(); updateBadge();
    document.querySelectorAll('#navCartBadge, .nav-cart-badge').forEach(function(b){ b.style.transform='scale(1.6)'; setTimeout(function(){ b.style.transform='scale(1)'; },300); });
    openCartPage();
}

window.updateQty = function(i, d) {
    if (!cart[i]) return;
    cart[i].qty = (cart[i].qty||1)+d;
    if (cart[i].qty<=0) cart.splice(i,1);
    saveCart(); renderCartPage();
};
window.removeFromCart = function(i) { cart.splice(i,1); saveCart(); renderCartPage(); };

// ─── NAV ICON ───
document.addEventListener('DOMContentLoaded', function() {
    var icon = document.getElementById('navCartIcon');
    if (icon) icon.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.parent !== window) window.parent.postMessage({type:'openCart'},'*');
        else openCartPage();
    });
    updateBadge();
});

// ─── CROSS-FRAME ───
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'addToCart') addToCart(e.data);
    else if (e.data && e.data.type === 'openCart') openCartPage();
});
window.addEventListener('storage', function(e) {
    if (e.key === 'aura_cart') { cart = JSON.parse(e.newValue||'[]'); updateBadge(); }
});
