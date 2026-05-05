// ═══ Aura Boxed Gifts — Cart System ═══
// Handles: localStorage persistence, quantity, notification popup, sidebar, Razorpay checkout

let cart = JSON.parse(localStorage.getItem('aura_cart')) || [];

const API_BASE = 'https://aura.devshubh.me'; // Oracle backend

const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const navCartIcon = document.getElementById('navCartIcon');
const navCartBadge = document.getElementById('navCartBadge');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalAmt = document.getElementById('cartTotalAmt');
const btnCheckout = document.getElementById('btnCheckout');

// Notification popup elements (may not exist on home page)
const cartNotif = document.getElementById('cartNotif');
const cartNotifProduct = document.getElementById('cartNotifProduct');
const cartNotifCount = document.getElementById('cartNotifCount');
const btnViewCart = document.getElementById('btnViewCart');
const btnCheckoutNotif = document.getElementById('btnCheckoutNotif');

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

function renderCart() {
    var totalItems = getTotalItems();
    if (navCartBadge) navCartBadge.textContent = totalItems;
    if (cartNotifCount) cartNotifCount.textContent = totalItems;
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div style="text-align:center; padding:40px 20px;"><h3 style="font-size:1.3rem; margin-bottom:12px; color:var(--text-dark);">Your cart is empty</h3><p style="color:var(--text-light); font-size:0.88rem;">Continue shopping to add items.</p></div>';
    } else {
        cart.forEach(function(item, index) {
            var qty = item.qty || 1;
            var div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML =
                '<img src="' + item.img + '" alt="' + item.item + '">' +
                '<div class="cart-item-info">' +
                    '<div class="cart-item-title">' + item.item + '</div>' +
                    '<div class="cart-item-price">Rs. ' + item.price + '.00</div>' +
                    '<div class="cart-item-qty">' +
                        '<button onclick="updateQty(' + index + ', -1)">−</button>' +
                        '<span>' + qty + '</span>' +
                        '<button onclick="updateQty(' + index + ', 1)">+</button>' +
                    '</div>' +
                '</div>' +
                '<div class="cart-item-actions">' +
                    '<div class="cart-item-total">Rs. ' + (item.price * qty) + '.00</div>' +
                    '<button class="cart-item-remove" onclick="removeFromCart(' + index + ')"><i class="fas fa-trash-alt"></i></button>' +
                '</div>';
            cartItemsContainer.appendChild(div);
        });
    }

    if (cartTotalAmt) cartTotalAmt.textContent = 'Rs. ' + getTotalPrice() + '.00';
}

// ─── CART ACTIONS ───
function addToCart(itemObj) {
    // Check if item already exists — increment qty instead of duplicating
    var existing = cart.findIndex(function(c) { return c.item === itemObj.item && c.price === itemObj.price; });
    if (existing >= 0) {
        cart[existing].qty = (cart[existing].qty || 1) + 1;
    } else {
        itemObj.qty = 1;
        cart.push(itemObj);
    }
    saveCart();
    renderCart();

    // Animate badge
    if (navCartBadge) {
        navCartBadge.style.transform = 'scale(1.6)';
        setTimeout(function() { navCartBadge.style.transform = 'scale(1)'; }, 300);
    }

    // Show notification popup (BoldPetals style)
    showCartNotification(itemObj);
}

function showCartNotification(item) {
    if (!cartNotif || !cartNotifProduct) return;
    cartNotifProduct.innerHTML =
        '<img src="' + item.img + '" alt="' + item.item + '">' +
        '<span class="notif-prod-name">' + item.item + '</span>';
    if (cartNotifCount) cartNotifCount.textContent = getTotalItems();
    cartNotif.classList.add('active');

    // Auto-hide after 5 seconds
    clearTimeout(window._cartNotifTimer);
    window._cartNotifTimer = setTimeout(function() {
        cartNotif.classList.remove('active');
    }, 5000);
}

window.updateQty = function(index, delta) {
    if (!cart[index]) return;
    cart[index].qty = (cart[index].qty || 1) + delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
    renderCart();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
};

// ─── UI LISTENERS ───
if (navCartIcon) {
    navCartIcon.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.parent !== window) {
            window.parent.postMessage({type: 'openCart'}, '*');
        } else {
            openCart();
        }
    });
}

function openCart() {
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.add('active');
        cartOverlay.classList.add('active');
    }
}

function closeCart() {
    if (cartSidebar) cartSidebar.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
}

if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// Notification popup buttons
if (btnViewCart) {
    btnViewCart.addEventListener('click', function() {
        if (cartNotif) cartNotif.classList.remove('active');
        openCart();
    });
}
if (btnCheckoutNotif) {
    btnCheckoutNotif.addEventListener('click', function() {
        if (cartNotif) cartNotif.classList.remove('active');
        openCart();
        // Trigger checkout after sidebar opens
        setTimeout(function() {
            if (btnCheckout) btnCheckout.click();
        }, 500);
    });
}

// ─── CROSS-FRAME MESSAGING ───
window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'addToCart') {
        addToCart(e.data);
    } else if (e.data && e.data.type === 'openCart') {
        openCart();
    }
});

// Sync cart across tabs/iframes
window.addEventListener('storage', function(e) {
    if (e.key === 'aura_cart') {
        cart = JSON.parse(e.newValue || '[]');
        renderCart();
    }
});

// ─── RAZORPAY CHECKOUT ───
if (btnCheckout) {
    btnCheckout.addEventListener('click', async function() {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }

        var customerName = prompt("Please enter your Name:");
        if (!customerName) return;
        var customerEmail = prompt("Please enter your Email:");
        if (!customerEmail) return;
        var customerPhone = prompt("Please enter your Phone number:");
        if (!customerPhone) return;

        btnCheckout.textContent = "Processing...";
        btnCheckout.disabled = true;

        try {
            var totalAmount = getTotalPrice();

            var response = await fetch(API_BASE + '/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount })
            });

            var data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create order.');
            }

            var options = {
                key: data.key_id,
                amount: data.order.amount,
                currency: "INR",
                name: "Aura Boxed Gifts",
                description: "Purchase from Aura Boxed Gifts",
                image: "https://auraboxedgifts.in/images/web/auraboxedgifts.png",
                order_id: data.order.id,
                handler: async function(response) {
                    var verifyRes = await fetch(API_BASE + '/api/verify-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            cartDetails: cart,
                            customer: { name: customerName, email: customerEmail, phone: customerPhone }
                        })
                    });

                    var verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        alert("Payment Successful! Your order has been placed.");
                        cart = [];
                        saveCart();
                        renderCart();
                        closeCart();
                    } else {
                        alert("Payment verification failed.");
                    }
                },
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerPhone
                },
                theme: { color: "#b76e79" }
            };

            var rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function(response) {
                alert("Payment Failed: " + response.error.description);
            });
            rzp1.open();

        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            btnCheckout.textContent = "Check out";
            btnCheckout.disabled = false;
        }
    });
}

// ─── INIT ───
renderCart();
