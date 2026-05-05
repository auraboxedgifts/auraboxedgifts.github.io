// Cart State Management
let cart = JSON.parse(localStorage.getItem('aura_cart')) || [];

const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const navCartIcon = document.getElementById('navCartIcon');
const navCartBadge = document.getElementById('navCartBadge');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalAmt = document.getElementById('cartTotalAmt');
const btnCheckout = document.getElementById('btnCheckout');

function saveCart() {
    localStorage.setItem('aura_cart', JSON.stringify(cart));
}

function renderCart() {
    if (navCartBadge) navCartBadge.textContent = cart.length;
    if (!cartItemsContainer) return; // If script runs on a page without full cart DOM
    
    cartItemsContainer.innerHTML = '';
    
    let total = 0;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:20px;">Your cart is empty.</p>';
    } else {
        cart.forEach((item, index) => {
            total += item.price;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${item.img}" alt="Product">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.item}</div>
                    <div class="cart-item-price">₹${item.price}</div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            cartItemsContainer.appendChild(div);
        });
    }
    
    cartTotalAmt.textContent = `₹${total}`;
}

function addToCart(itemObj) {
    cart.push(itemObj);
    saveCart();
    renderCart();
    
    // Animate badge
    if (navCartBadge) {
        navCartBadge.style.transform = 'scale(1.5)';
        setTimeout(() => { navCartBadge.style.transform = 'scale(1)'; }, 300);
    }
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
};

// UI Listeners
if (navCartIcon) {
    navCartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.parent !== window) {
            window.parent.postMessage({type: 'openCart'}, '*');
        } else if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
        }
    });
}

function closeCart() {
    if (cartSidebar) cartSidebar.classList.remove('active');
    if (cartOverlay) cartOverlay.classList.remove('active');
}

if (cartClose) cartClose.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// Listen for Add To Cart from collection iframes
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'addToCart') {
        addToCart(e.data);
        // Auto-open cart in parent if requested from iframe
        if (window.parent !== window) {
            window.parent.postMessage({type: 'openCart'}, '*');
        } else if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
        }
    } else if (e.data && e.data.type === 'openCart') {
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('active');
            cartOverlay.classList.add('active');
        }
    }
});

// Listen for storage events to sync cart across tabs/iframes
window.addEventListener('storage', (e) => {
    if (e.key === 'aura_cart') {
        cart = JSON.parse(e.newValue || '[]');
        renderCart();
    }
});

// Razorpay Checkout Flow
if (btnCheckout) {
    btnCheckout.addEventListener('click', async () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
    
    // Create checkout form modal or prompt
    const customerName = prompt("Please enter your Name:");
    if (!customerName) return;
    const customerEmail = prompt("Please enter your Email:");
    if (!customerEmail) return;
    const customerPhone = prompt("Please enter your Phone number:");
    if (!customerPhone) return;

    btnCheckout.textContent = "Processing...";
    btnCheckout.disabled = true;

    try {
        // Calculate total in rupees
        const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);

        // Request Order ID from our backend
        const response = await fetch('http://localhost:5013/api/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalAmount })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to create order. Razorpay keys might not be set yet.');
        }

        const options = {
            key: data.key_id, // Key passed from backend
            amount: data.order.amount,
            currency: "INR",
            name: "Aura Boxed Gifts",
            description: "Purchase from Aura Boxed Gifts",
            image: "https://auraboxedgifts.in/images/web/auraboxedgifts.png",
            order_id: data.order.id,
            handler: async function (response) {
                // Verify payment on backend
                const verifyRes = await fetch('http://localhost:5013/api/verify-payment', {
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
                
                const verifyData = await verifyRes.json();
                if (verifyData.success) {
                    alert("Payment Successful! We have received your order.");
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
        
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response){
            alert("Payment Failed: " + response.error.description);
        });
        rzp1.open();

    } catch (err) {
        console.error(err);
        alert(err.message);
    } finally {
        btnCheckout.textContent = "Proceed to Checkout";
        btnCheckout.disabled = false;
    }
    });
}

// Init
renderCart();
