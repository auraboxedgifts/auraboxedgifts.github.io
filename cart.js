// ═══ Aura Boxed Gifts — Cart System ═══
// Full-page cart overlay, checkout form, Razorpay integration

let cart = JSON.parse(localStorage.getItem('aura_cart')) || [];
const API_BASE = 'https://aura.devshubh.me';

// ─── SAVE & RENDER ───
function saveCart() {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
}

function getTotalItems() {
    return cart.reduce(function(sum, item) { return sum + (item.qty || 1); }, 0);
}

function getTotalPrice() {
    return cart.reduce(function(sum, item) { return sum + item.price * (item.qty || 1); }, 0);
}

function updateBadge() {
    var badges = document.querySelectorAll('#navCartBadge, .nav-cart-badge');
    var total = getTotalItems();
    badges.forEach(function(b) { b.textContent = total; });
}

// ─── BUILD CART PAGE OVERLAY (created once, reused) ───
function getCartOverlay() {
    var el = document.getElementById('cartPageOverlay');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'cartPageOverlay';
    el.className = 'cart-page-overlay';
    el.innerHTML = `
    <div class="cart-page">
      <header class="cart-page-header">
        <h1>Your Cart</h1>
        <button class="cart-page-close" id="cartPageClose">&times;</button>
      </header>
      <div class="cart-page-body" id="cartPageBody">
        <!-- Dynamically rendered -->
      </div>
      <footer class="cart-page-footer" id="cartPageFooter">
        <div class="cart-page-total">
          <span>Estimated total</span>
          <span id="cartPageTotalAmt">Rs. 0.00</span>
        </div>
        <p class="cart-page-tax">Taxes, discounts and shipping calculated at checkout.</p>
        <button class="cart-page-checkout-btn" id="cartPageCheckoutBtn">Check out</button>
        <button class="cart-page-continue" id="cartPageContinue">Continue shopping</button>
      </footer>
    </div>
    `;
    document.body.appendChild(el);

    el.querySelector('#cartPageClose').addEventListener('click', closeCartPage);
    el.querySelector('#cartPageContinue').addEventListener('click', closeCartPage);
    el.querySelector('#cartPageCheckoutBtn').addEventListener('click', openCheckoutForm);

    return el;
}

function renderCartPage() {
    var overlay = getCartOverlay();
    var body = overlay.querySelector('#cartPageBody');
    var footer = overlay.querySelector('#cartPageFooter');
    var totalEl = overlay.querySelector('#cartPageTotalAmt');

    if (cart.length === 0) {
        body.innerHTML = '<div class="cart-page-empty"><h2>Your cart is empty</h2><p>Continue shopping to add items.</p><button class="cart-page-shop-btn" onclick="closeCartPage()">Continue shopping</button></div>';
        footer.style.display = 'none';
    } else {
        footer.style.display = '';
        var html = '<div class="cart-page-table"><div class="cart-page-table-header"><span>Product</span><span>Quantity</span><span>Total</span></div>';
        cart.forEach(function(item, index) {
            var qty = item.qty || 1;
            html += '<div class="cart-page-row">' +
                '<div class="cart-page-product">' +
                    '<img src="' + (item.img || '') + '" alt="' + item.item + '">' +
                    '<div><div class="cart-page-prod-name">' + item.item + '</div>' +
                    '<div class="cart-page-prod-price">Rs. ' + item.price + '.00</div></div>' +
                '</div>' +
                '<div class="cart-page-qty">' +
                    '<div class="qty-control">' +
                        '<button onclick="updateQty(' + index + ', -1)">−</button>' +
                        '<span>' + qty + '</span>' +
                        '<button onclick="updateQty(' + index + ', 1)">+</button>' +
                    '</div>' +
                    '<button class="cart-page-remove" onclick="removeFromCart(' + index + ')"><i class="fas fa-trash-alt"></i></button>' +
                '</div>' +
                '<div class="cart-page-row-total">Rs. ' + (item.price * qty) + '.00</div>' +
            '</div>';
        });
        html += '</div>';
        body.innerHTML = html;
    }

    if (totalEl) totalEl.textContent = 'Rs. ' + getTotalPrice() + '.00';
    updateBadge();
}

function openCartPage() {
    renderCartPage();
    var overlay = getCartOverlay();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartPage() {
    var overlay = document.getElementById('cartPageOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ─── CHECKOUT FORM OVERLAY (replaces prompt() dialogs) ───
function openCheckoutForm() {
    var existing = document.getElementById('checkoutFormOverlay');
    if (existing) existing.remove();

    var total = getTotalPrice();
    var el = document.createElement('div');
    el.id = 'checkoutFormOverlay';
    el.className = 'checkout-overlay active';
    el.innerHTML = `
    <div class="checkout-form-card">
      <button class="checkout-form-close" onclick="document.getElementById('checkoutFormOverlay').remove()">&times;</button>
      <h2>Checkout</h2>
      <p class="checkout-total-line">Total: <strong>Rs. ${total}.00</strong></p>
      <form id="checkoutForm">
        <div class="checkout-field">
          <label for="ckName">Full Name</label>
          <input type="text" id="ckName" placeholder="Enter your name" required>
        </div>
        <div class="checkout-field">
          <label for="ckEmail">Email</label>
          <input type="email" id="ckEmail" placeholder="Enter your email" required>
        </div>
        <div class="checkout-field">
          <label for="ckPhone">Phone</label>
          <input type="tel" id="ckPhone" placeholder="Enter your phone number" required>
        </div>
        <button type="submit" class="checkout-pay-btn" id="checkoutPayBtn">
          <i class="fas fa-lock"></i> Pay Rs. ${total}.00
        </button>
      </form>
      <p class="checkout-secure">🔒 Secured by Razorpay</p>
    </div>
    `;
    document.body.appendChild(el);

    document.getElementById('checkoutForm').addEventListener('submit', function(e) {
        e.preventDefault();
        processPayment(
            document.getElementById('ckName').value,
            document.getElementById('ckEmail').value,
            document.getElementById('ckPhone').value
        );
    });
}

async function processPayment(name, email, phone) {
    var payBtn = document.getElementById('checkoutPayBtn');
    if (payBtn) { payBtn.textContent = 'Processing...'; payBtn.disabled = true; }

    try {
        var totalAmount = getTotalPrice();
        var response = await fetch(API_BASE + '/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalAmount })
        });
        var data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to create order.');

        var options = {
            key: data.key_id,
            amount: data.order.amount,
            currency: "INR",
            name: "Aura Boxed Gifts",
            description: "Purchase from Aura Boxed Gifts",
            image: "https://auraboxedgifts.in/images/web/auraboxedgifts.png",
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
                        customer: { name: name, email: email, phone: phone }
                    })
                });
                var verifyData = await verifyRes.json();
                if (verifyData.success) {
                    cart = []; saveCart(); updateBadge();
                    var ckOv = document.getElementById('checkoutFormOverlay');
                    if (ckOv) ckOv.remove();
                    closeCartPage();
                    showSuccessMessage();
                } else {
                    alert("Payment verification failed.");
                }
            },
            prefill: { name: name, email: email, contact: phone },
            theme: { color: "#b76e79" }
        };

        var rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function(resp) { alert("Payment Failed: " + resp.error.description); });
        var ckOv = document.getElementById('checkoutFormOverlay');
        if (ckOv) ckOv.remove();
        rzp1.open();
    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        if (payBtn) { payBtn.innerHTML = '<i class="fas fa-lock"></i> Pay Rs. ' + getTotalPrice() + '.00'; payBtn.disabled = false; }
    }
}

function showSuccessMessage() {
    var el = document.createElement('div');
    el.className = 'checkout-overlay active';
    el.innerHTML = '<div class="checkout-form-card" style="text-align:center"><h2 style="color:#27ae60">✓ Order Placed!</h2><p>Thank you! Your order has been placed successfully.</p><button class="cart-page-shop-btn" onclick="this.closest(\'.checkout-overlay\').remove()">Continue shopping</button></div>';
    document.body.appendChild(el);
}

// ─── CART ACTIONS ───
function addToCart(itemObj) {
    var existing = cart.findIndex(function(c) { return c.item === itemObj.item && c.price === itemObj.price; });
    if (existing >= 0) {
        cart[existing].qty = (cart[existing].qty || 1) + 1;
    } else {
        itemObj.qty = 1;
        cart.push(itemObj);
    }
    saveCart();
    updateBadge();

    // Animate badge
    var badges = document.querySelectorAll('#navCartBadge, .nav-cart-badge');
    badges.forEach(function(b) { b.style.transform = 'scale(1.6)'; setTimeout(function() { b.style.transform = 'scale(1)'; }, 300); });

    // Show add-to-cart confirmation: open the cart page directly
    openCartPage();
}

window.updateQty = function(index, delta) {
    if (!cart[index]) return;
    cart[index].qty = (cart[index].qty || 1) + delta;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    renderCartPage();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCartPage();
};

// ─── NAV CART ICON CLICK ───
document.addEventListener('DOMContentLoaded', function() {
    var navCartIcon = document.getElementById('navCartIcon');
    if (navCartIcon) {
        navCartIcon.addEventListener('click', function(e) {
            e.preventDefault();
            if (window.parent !== window) {
                // Inside iframe: tell parent to open cart
                window.parent.postMessage({ type: 'openCart' }, '*');
            } else {
                openCartPage();
            }
        });
    }
    updateBadge();
});

// ─── CROSS-FRAME MESSAGING ───
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'addToCart') {
        addToCart(e.data);
    } else if (e.data && e.data.type === 'openCart') {
        openCartPage();
    }
});

// Sync cart across tabs
window.addEventListener('storage', function(e) {
    if (e.key === 'aura_cart') {
        cart = JSON.parse(e.newValue || '[]');
        updateBadge();
        if (document.getElementById('cartPageOverlay') && document.getElementById('cartPageOverlay').classList.contains('active')) {
            renderCartPage();
        }
    }
});
