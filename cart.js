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
    var w = document.getElementById('auraAIWidget');
    if (w) w.classList.add('aura-docked');
}
function closeCartPage() {
    var o = document.getElementById('cartPageOverlay');
    if (o) { o.classList.remove('active'); document.body.style.overflow = ''; }
    var w = document.getElementById('auraAIWidget');
    if (w) w.classList.remove('aura-docked');
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
            '<div style="display:flex; gap:10px;">' +
              '<button class="ck-pay-now-btn" id="ckVerifyOtpBtn" style="padding: 12px; margin-top: 5px; flex:1;">Verify OTP</button>' +
              '<button class="ck-pay-now-btn" id="ckResendOtpBtn" style="padding: 12px; margin-top: 5px; flex:1; background:#555;">Resend OTP</button>' +
            '</div>' +
          '</div>' +
          '<div id="ckContactSuccess" style="display: none; color: #27ae60; font-weight: 500; align-items: center; gap: 8px;"><i class="fas fa-check-circle"></i> <span id="ckVerifiedEmailText"></span></div>' +
        '</section>' +

        '<!-- STEP 2: DELIVERY -->' +
        '<section class="ck-section" id="stepDelivery" style="opacity: 0.4; pointer-events: none;">' +
          '<h3>Delivery</h3>' +
          '<div class="ck-field"><label>Country/Region</label><select id="ckCountry" style="padding-top: 24px; padding-bottom: 4px;"><option>India</option></select></div>' +
          '<div class="ck-row">' +
            '<div class="ck-field ck-half"><input type="text" id="ckFirstName" placeholder="First name"></div>' +
            '<div class="ck-field ck-half"><input type="text" id="ckLastName" placeholder="Last name"></div>' +
          '</div>' +
          '<div class="ck-field"><input type="text" id="ckAddress" placeholder="Address (Start typing for suggestions...)"></div>' +
          '<div style="text-align: right; margin-top: -8px; margin-bottom: 12px;"><span id="ckManualAddressBtn" style="font-size: 11px; color: #b76e79; cursor: pointer; text-decoration: underline;">Enter address manually</span></div>' +
          '<div class="ck-field"><input type="text" id="ckApartment" placeholder="Apartment, suite, etc. (optional)"></div>' +
          '<div class="ck-row ck-row-3">' +
            '<div class="ck-field"><input type="text" id="ckCity" placeholder="City"></div>' +
            '<div class="ck-field"><input type="text" id="ckState" placeholder="State"></div>' +
            '<div class="ck-field"><input type="text" id="ckPincode" placeholder="PIN code"></div>' +
          '</div>' +
          '<div class="ck-field"><input type="tel" id="ckPhone" placeholder="Phone"></div>' +
          '<div class="ck-field">' +
            '<div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">' +
              '<input type="checkbox" id="ckSaveInfo" style="width: 16px; height: 16px; accent-color: #b76e79; cursor: pointer;">' +
              '<label for="ckSaveInfo" style="position: static; font-size: 13px; color: #555; pointer-events: auto; cursor: pointer;">Save this information for next time</label>' +
            '</div>' +
          '</div>' +
          '<button class="ck-pay-now-btn" id="ckDeliveryBtn" style="margin-top: 15px;">Continue to Shipping</button>' +
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
    
    var w = document.getElementById('auraAIWidget');
    if (w) w.classList.add('aura-docked');

    // Google Maps Autocomplete Init (Dynamic)
    fetch(API_BASE + '/api/config')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.googleMapsApiKey) {
                var script = document.createElement('script');
                script.src = 'https://maps.googleapis.com/maps/api/js?key=' + data.googleMapsApiKey + '&libraries=places&v=weekly';
                script.async = true;
                script.onload = function() {
                    if (window.google && window.google.maps && window.google.maps.places) {
                        try {
                            if (window.google.maps.places.PlaceAutocompleteElement) {
                                // Inject custom CSS to make Web Component match standard inputs
                                var compStyle = document.createElement('style');
                                compStyle.innerHTML = `
                                    #ckAddress { width: 100%; display: block; color-scheme: light; }
                                    #ckAddress::part(input) {
                                        width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 4px;
                                        font-size: 14px; font-family: inherit; background-color: #fff; color: #333;
                                        box-sizing: border-box; box-shadow: none; outline: none; transition: border-color 0.2s;
                                    }
                                    #ckAddress::part(input):focus { border-color: #333; }
                                `;
                                document.head.appendChild(compStyle);

                                var autocomplete = new window.google.maps.places.PlaceAutocompleteElement({
                                    componentRestrictions: { country: ['in'] }
                                });
                                autocomplete.id = 'ckAddress';
                                var oldInput = document.getElementById('ckAddress');
                                oldInput.parentNode.replaceChild(autocomplete, oldInput);

                                autocomplete.addEventListener('gmp-placeselect', async function(event) {
                                    var place = event.place;
                                    if (!place) return;
                                    try {
                                        await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
                                        var city='', state='', pin='';
                                        if(place.addressComponents) {
                                            place.addressComponents.forEach(function(c) {
                                                const types = c.types || [];
                                                if(types.includes('locality') || types.includes('postal_town')) city = c.longText;
                                                if(types.includes('administrative_area_level_1')) state = c.longText;
                                                if(types.includes('postal_code')) pin = c.longText;
                                            });
                                        }
                                        if(city) document.getElementById('ckCity').value = city;
                                        if(state) document.getElementById('ckState').value = state;
                                        if(pin) document.getElementById('ckPincode').value = pin;
                                        
                                        // Update the input value to the full formatted address for backend
                                        if (place.formattedAddress) {
                                            document.getElementById('ckAddress').inputValue = place.formattedAddress;
                                        }
                                    } catch (fetchErr) {
                                        console.error('Failed to fetch place details:', fetchErr);
                                    }
                                });
                            } else {
                                var input = document.getElementById('ckAddress');
                                var autocompleteLegacy = new window.google.maps.places.Autocomplete(input, { types: ['address'], componentRestrictions: { country: 'in' } });
                                autocompleteLegacy.addListener('place_changed', function() {
                                    var place = autocompleteLegacy.getPlace();
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
                        } catch (e) {
                            console.error('Maps initialization error:', e);
                        }
                    }
                };
                document.head.appendChild(script);
            }
        })
        .catch(err => console.error('Config fetch error:', err));

    // Auto-login with JWT Token
    var authToken = localStorage.getItem('auraAuthToken');
    if (authToken) {
        fetch(API_BASE + '/api/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: authToken })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                verifiedEmail = data.email;
                document.getElementById('ckOtpForm').style.display = 'none';
                document.getElementById('ckContactSuccess').style.display = 'flex';
                document.getElementById('ckContactSuccess').innerHTML = '<i class="fas fa-check-circle"></i> Logged in as: ' + data.email + ' <a href="#" id="ckLogout" style="margin-left:10px;color:#b76e79;text-decoration:underline;font-size:0.85rem;">(Logout)</a>';
                
                // Trigger fetching of saved user info
                fetch(API_BASE + '/api/get-user-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: authToken })
                })
                .then(r => r.json())
                .then(userData => {
                    if (userData.success && userData.data) {
                        if(userData.data.firstName) document.getElementById('ckFirstName').value = userData.data.firstName;
                        if(userData.data.lastName) document.getElementById('ckLastName').value = userData.data.lastName;
                        if(userData.data.city) document.getElementById('ckCity').value = userData.data.city;
                        if(userData.data.state) document.getElementById('ckState').value = userData.data.state;
                        if(userData.data.pincode) document.getElementById('ckPincode').value = userData.data.pincode;
                        if(userData.data.phone) document.getElementById('ckPhone').value = userData.data.phone;
                        document.getElementById('ckSaveInfo').checked = true;
                    }
                }).catch(e => console.error("Error fetching user info:", e));

                document.getElementById('ckLogout').addEventListener('click', function(e) {
                    e.preventDefault();
                    localStorage.removeItem('auraAuthToken');
                    verifiedEmail = '';
                    document.getElementById('ckContactSuccess').style.display = 'none';
                    document.getElementById('ckOtpForm').style.display = 'block';
                    document.getElementById('ckEmail').value = '';
                    document.getElementById('stepDelivery').style.opacity = '0.4';
                    document.getElementById('stepDelivery').style.pointerEvents = 'none';
                });

                document.getElementById('stepDelivery').style.opacity = '1';
                document.getElementById('stepDelivery').style.pointerEvents = 'auto';
            } else {
                localStorage.removeItem('auraAuthToken');
            }
        })
        .catch(err => console.log('Token error', err));
    }

    // Manual Address Toggle Logic
    document.getElementById('ckManualAddressBtn').addEventListener('click', function() {
        var currentAddr = document.getElementById('ckAddress');
        var val = currentAddr.inputValue || currentAddr.value || '';
        
        var newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.id = 'ckAddress';
        newInput.placeholder = 'Address (House No, Building, Street, Area)';
        newInput.value = val;
        
        currentAddr.parentNode.replaceChild(newInput, currentAddr);
        this.style.display = 'none'; // Hide the button
        
        // Remove red border if any
        newInput.style.border = '1px solid #ddd';
    });

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

    document.getElementById('ckResendOtpBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        var em = document.getElementById('ckEmailDisplay').textContent;
        if(!em) return;
        this.textContent = 'Resending...'; this.disabled = true;
        try {
            var res = await fetch(API_BASE + '/api/resend-otp', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email: em}) });
            var data = await res.json();
            if(data.success) {
                alert('A new OTP has been sent to your email.');
            } else { alert(data.error || 'Failed to resend OTP'); }
        } catch(e) { alert('Error: ' + e.message); }
        var btn = this;
        setTimeout(function() { btn.textContent = 'Resend OTP'; btn.disabled = false; }, 3000);
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
                if(data.token) localStorage.setItem('auraAuthToken', data.token);
                document.getElementById('ckOtpVerifyForm').style.display = 'none';
                document.getElementById('ckContactSuccess').style.display = 'flex';
                document.getElementById('ckContactSuccess').innerHTML = '<i class="fas fa-check-circle"></i> Logged in as: ' + em + ' <a href="#" id="ckLogout" style="margin-left:10px;color:#b76e79;text-decoration:underline;font-size:0.85rem;">(Logout)</a>';
                
                document.getElementById('ckLogout').addEventListener('click', function(e) {
                    e.preventDefault();
                    localStorage.removeItem('auraAuthToken');
                    verifiedEmail = '';
                    document.getElementById('ckContactSuccess').style.display = 'none';
                    document.getElementById('ckOtpForm').style.display = 'block';
                    document.getElementById('ckEmail').value = '';
                    document.getElementById('stepDelivery').style.opacity = '0.4';
                    document.getElementById('stepDelivery').style.pointerEvents = 'none';
                });

                document.getElementById('stepDelivery').style.opacity = '1';
                document.getElementById('stepDelivery').style.pointerEvents = 'auto';
            } else { alert(data.error || 'Invalid OTP'); }
        } catch(e) { alert('Error: ' + e.message); }
        this.textContent = 'Verify OTP'; this.disabled = false;
    });

    // Populate saved info if exists
    try {
        var savedInfo = JSON.parse(localStorage.getItem('auraSavedInfo'));
        if (savedInfo) {
            if(savedInfo.firstName) document.getElementById('ckFirstName').value = savedInfo.firstName;
            if(savedInfo.lastName) document.getElementById('ckLastName').value = savedInfo.lastName;
            if(savedInfo.city) document.getElementById('ckCity').value = savedInfo.city;
            if(savedInfo.state) document.getElementById('ckState').value = savedInfo.state;
            if(savedInfo.pincode) document.getElementById('ckPincode').value = savedInfo.pincode;
            if(savedInfo.phone) document.getElementById('ckPhone').value = savedInfo.phone;
            document.getElementById('ckSaveInfo').checked = true;
            // Note: address web component will be handled separately if needed
        }
    } catch(e) {}

    // Stepper logic
    document.getElementById('ckDeliveryBtn').addEventListener('click', function(e) {
        e.preventDefault();
        var addrEl = document.getElementById('ckAddress');
        var addressVal = addrEl.value || addrEl.inputValue;
        
        var requiredFields = ['ckFirstName', 'ckCity', 'ckPhone'];
        var isValid = true;
        
        // Check standard inputs
        requiredFields.forEach(id => {
            var el = document.getElementById(id);
            if (!el) return;
            if (!el.value) {
                isValid = false;
                el.style.border = '1px solid #ff4d4f';
            } else {
                el.style.border = '1px solid #ddd';
            }
        });
        
        // Check address separately (could be Web Component or standard input)
        if (!addressVal) {
            isValid = false;
            addrEl.style.border = '1px solid #ff4d4f';
            if (addrEl.tagName === 'GMP-PLACE-AUTOCOMPLETE') {
                addrEl.style.borderRadius = '4px';
            }
        } else {
            if (addrEl.tagName === 'GMP-PLACE-AUTOCOMPLETE') {
                addrEl.style.border = 'none'; // inner part handles it
            } else {
                addrEl.style.border = '1px solid #ddd';
            }
        }

        if(!isValid) {
            return; // Stay on same step, red borders will guide user
        }
        
        // Reset borders if valid
        requiredFields.forEach(id => document.getElementById(id).style.border = '1px solid #ddd');
        addrEl.style.border = 'none';
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
        var addrEl = document.getElementById('ckAddress');
        var address = addrEl.value || addrEl.inputValue;
        var city = document.getElementById('ckCity').value;
        var state = document.getElementById('ckState').value;
        var pincode = document.getElementById('ckPincode').value;
        var phone = document.getElementById('ckPhone').value;

        if (!verifiedEmail || !firstName || !address || !city || !phone) {
            // Wait, they shouldn't be able to reach here if validation above worked, but just in case
            return;
        }

        // Save info logic
        if (document.getElementById('ckSaveInfo') && document.getElementById('ckSaveInfo').checked) {
            var savePayload = { firstName, lastName, address, city, state, pincode, phone };
            localStorage.setItem('auraSavedInfo', JSON.stringify(savePayload));
            
            // Also save to backend
            fetch(API_BASE + '/api/save-user-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verifiedEmail, ...savePayload })
            }).catch(e => console.log('Backend save error', e));
        } else {
            localStorage.removeItem('auraSavedInfo');
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

    // ─── USER PROFILE ICON ───
    var navIcons = document.querySelector('.nav-icons');
    if (navIcons) {
        var userIconContainer = document.createElement('div');
        userIconContainer.style.position = 'relative';
        userIconContainer.style.display = 'inline-block';
        userIconContainer.style.marginRight = '15px';
        
        var userIcon = document.createElement('a');
        userIcon.href = "#";
        userIcon.id = "navUserIcon";
        userIcon.innerHTML = '<i class="fas fa-user"></i>';
        userIcon.style.color = "var(--text-dark)";
        
        var userDropdown = document.createElement('div');
        userDropdown.id = "navUserDropdown";
        userDropdown.style.cssText = "display:none; position:absolute; top:30px; right:-10px; background:#fff; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.1); padding:15px; z-index:10000; min-width:180px; text-align:center; border: 1px solid rgba(183,110,121,0.2);";
        userDropdown.innerHTML = '<p id="navUserEmail" style="font-size:12px; color:#333; margin-bottom:10px; word-break:break-all;"></p><button id="navUserLogout" style="background:#b76e79; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; width:100%; font-size:12px; transition:0.3s;">Logout</button>';
        
        userIconContainer.appendChild(userIcon);
        userIconContainer.appendChild(userDropdown);
        
        var cartIconEl = document.getElementById('navCartIcon');
        if (cartIconEl) {
            cartIconEl.parentNode.insertBefore(userIconContainer, cartIconEl);
        }
        
        function updateNavUser() {
            var token = localStorage.getItem('auraAuthToken');
            if (token) {
                // We use the token to show logged in state
                var userEmail = '';
                // Try to parse payload or fetch. For UI, we'll just show it toggles dropdown.
                // We fetch verify-token to get email.
                fetch('https://aura.devshubh.me/api/verify-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
                .then(res => res.json())
                .then(data => {
                    if(data.success) {
                        document.getElementById('navUserEmail').textContent = data.email;
                        userIcon.onclick = function(e) { e.preventDefault(); userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none'; };
                    } else {
                        localStorage.removeItem('auraAuthToken');
                        userIcon.onclick = function(e) { e.preventDefault(); openCheckoutPage(); };
                    }
                }).catch(() => { userIcon.onclick = function(e) { e.preventDefault(); openCheckoutPage(); }; });
            } else {
                userIcon.onclick = function(e) { e.preventDefault(); openCheckoutPage(); };
            }
        }
        
        updateNavUser();
        window.addEventListener('storage', function(e) { if (e.key === 'auraAuthToken') updateNavUser(); });
        
        document.getElementById('navUserLogout').addEventListener('click', function() {
            localStorage.removeItem('auraAuthToken');
            userDropdown.style.display = 'none';
            updateNavUser();
            alert("Logged out successfully");
        });
    }
});

// ─── CROSS-FRAME ───
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'addToCart') addToCart(e.data);
    else if (e.data && e.data.type === 'openCart') openCartPage();
});
window.addEventListener('storage', function(e) {
    if (e.key === 'aura_cart') { cart = JSON.parse(e.newValue||'[]'); updateBadge(); }
});
