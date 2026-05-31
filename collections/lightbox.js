// Lightbox — pure JS image viewer with keyboard + swipe + AI context sync
(function() {
  let images = [];
  let currentIndex = 0;
  let lightbox, lbImg, lbCounter, lbProductName, lbProductPrice;
  let touchStartX = 0;

  function init() {
    // Create lightbox DOM
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
      </div>
      <div class="lightbox-counter"></div>
    `;
    document.body.appendChild(lightbox);

    lbImg = lightbox.querySelector('.lightbox-img');
    lbCounter = lightbox.querySelector('.lightbox-counter');
    lbProductName = lightbox.querySelector('#lbProductName');
    lbProductPrice = lightbox.querySelector('#lbProductPrice');

    lightbox.querySelector('.lightbox-close').addEventListener('click', close);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', prev);
    lightbox.querySelector('.lightbox-next').addEventListener('click', next);
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) close();
    });

    // Keyboard
    document.addEventListener('keydown', function(e) {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    });

    // Touch swipe
    lightbox.addEventListener('touchstart', function(e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    lightbox.addEventListener('touchend', function(e) {
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) prev(); else next();
      }
    }, { passive: true });

    // Collect image sources and product details from col-item data attributes
    images = Array.from(document.querySelectorAll('.col-item')).map(function(item) {
      return {
        src: item.querySelector('img').src,
        name: item.dataset.name || '',
        price: parseInt(item.dataset.price) || 0,
        img: item.dataset.img || item.querySelector('img').getAttribute('src')
      };
    });

    // Bind click on col-item cards (not on the add-to-cart button)
    document.querySelectorAll('.col-item').forEach(function(item, i) {
      item.addEventListener('click', function(e) {
        // Don't open lightbox if they clicked the add-to-cart button or qty control
        if (e.target.closest('.btn-add-cart') || e.target.closest('.btn-qty-control')) return;
        openLightbox(i);
      });
    });

    // Bind add-to-cart buttons
    document.querySelectorAll('.btn-add-cart').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const card = btn.closest('.col-item');
        const idx = parseInt(card.dataset.idx);
        const product = images[idx];
        const productId = card.dataset.id;
        if (product) {
          // Send to parent (for iframe usage) or handle locally
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'addToCart',
              item: product.name,
              img: product.img,
              price: product.price
            }, '*');
          } else if (typeof addToCart === 'function') {
            addToCart({
              item: product.name,
              img: product.img,
              price: product.price
            });
          }
          // Transform button into qty control
          replaceWithQtyControl(btn, card, product, productId);
        }
      });
    });

    // Check if items are already in cart and show qty controls
    initCartQtyButtons();

    // Listen for AI commands from parent
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'next_product') {
        if (!lightbox.classList.contains('active')) openLightbox(0);
        else next();
      }
      if (e.data && e.data.type === 'previous_product') {
        if (!lightbox.classList.contains('active')) openLightbox(0);
        else prev();
      }
    });
  }

  function openLightbox(index) {
    currentIndex = index;
    show(false);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Expose to global scope for AI tools
  window.auraOpenLightbox = openLightbox;

  function close() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function prev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    show(true);
  }

  function next() {
    currentIndex = (currentIndex + 1) % images.length;
    show(true);
  }

  function show(animate) {
    var product = images[currentIndex];
    if (!product) return;

    if (animate) {
      lbImg.style.transition = 'opacity 0.4s ease-in-out, transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      lbImg.style.opacity = '0';
      lbImg.style.transform = 'scale(0.95)';
      
      setTimeout(function() {
        lbImg.src = product.src;
        lbImg.onload = function() {
          lbImg.style.opacity = '1';
          lbImg.style.transform = 'scale(1)';
        };
        updateInfo();
      }, 400);
    } else {
      lbImg.style.transition = 'none';
      lbImg.style.opacity = '1';
      lbImg.style.transform = 'scale(1)';
      lbImg.src = product.src;
      updateInfo();
    }
  }

  function updateInfo() {
    var product = images[currentIndex];
    lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
    if (lbProductName) lbProductName.textContent = product.name;
    if (lbProductPrice) lbProductPrice.textContent = 'Rs. ' + product.price + '.00';

    // Sync Context with AI via parent window
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'context_update',
        productName: product.name,
        productPrice: product.price,
        productImg: product.img
      }, '*');
    }
  }

  // ─── Cart Qty Control Helpers ───
  function getCartItems() {
    try { return JSON.parse(localStorage.getItem('aura_cart_v2') || '[]'); } catch(e) { return []; }
  }

  function initCartQtyButtons() {
    var cart = getCartItems();
    if (!cart.length) return;
    document.querySelectorAll('.col-item').forEach(function(card) {
      var productId = card.dataset.id;
      var item = cart.find(function(c) { return c.productId === productId; });
      if (item && item.qty > 0) {
        var btn = card.querySelector('.btn-add-cart');
        if (btn) {
          var idx = parseInt(card.dataset.idx);
          replaceWithQtyControl(btn, card, images[idx], productId, item.qty);
        }
      }
    });
  }

  function replaceWithQtyControl(btn, card, product, productId, startQty) {
    var qty = startQty || 1;
    var control = document.createElement('div');
    control.className = 'btn-qty-control';
    control.innerHTML = '<button class="qty-minus">−</button><span>' + qty + '</span><button class="qty-plus">+</button>';
    btn.replaceWith(control);
    if (!startQty) bounceBadge();

    var qtySpan = control.querySelector('span');
    control.querySelector('.qty-minus').addEventListener('click', function(e) {
      e.stopPropagation();
      var currentQty = parseInt(qtySpan.textContent) - 1;
      if (currentQty <= 0) {
        var newBtn = document.createElement('button');
        newBtn.className = 'btn-add-cart';
        newBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to cart';
        control.replaceWith(newBtn);
        removeFromCart(productId);
        bounceBadge();
        newBtn.addEventListener('click', function(e2) {
          e2.stopPropagation();
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'addToCart', item: product.name, img: product.img, price: product.price }, '*');
          } else if (typeof addToCart === 'function') {
            addToCart({ item: product.name, img: product.img, price: product.price });
          }
          replaceWithQtyControl(newBtn, card, product, productId);
        });
        return;
      }
      qtySpan.textContent = currentQty;
      updateCartQty(productId, -1);
      bounceBadge();
    });
    control.querySelector('.qty-plus').addEventListener('click', function(e) {
      e.stopPropagation();
      var currentQty = parseInt(qtySpan.textContent) + 1;
      qtySpan.textContent = currentQty;
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'addToCart', item: product.name, img: product.img, price: product.price }, '*');
      } else if (typeof addToCart === 'function') {
        addToCart({ item: product.name, img: product.img, price: product.price });
      }
      bounceBadge();
    });
  }

  function bounceBadge() {
    document.querySelectorAll('.nav-cart-badge').forEach(function(badge) {
      badge.classList.remove('bounce');
      void badge.offsetWidth;
      badge.classList.add('bounce');
      setTimeout(function() { badge.classList.remove('bounce'); }, 600);
    });
  }

  function updateCartQty(productId, delta) {
    try {
      var cart = JSON.parse(localStorage.getItem('aura_cart_v2') || '[]');
      var item = cart.find(function(c) { return c.productId === productId; });
      if (item) {
        item.qty = (item.qty || 1) + delta;
        if (item.qty <= 0) cart = cart.filter(function(c) { return c.productId !== productId; });
      }
      localStorage.setItem('aura_cart_v2', JSON.stringify(cart));
      var count = cart.reduce(function(s, i) { return s + (i.qty || 1); }, 0);
      document.querySelectorAll('#navCartBadge, .nav-cart-badge').forEach(function(b) { b.textContent = count; });
    } catch(e) {}
  }

  function removeFromCart(productId) {
    try {
      var cart = JSON.parse(localStorage.getItem('aura_cart_v2') || '[]');
      cart = cart.filter(function(c) { return c.productId !== productId; });
      localStorage.setItem('aura_cart_v2', JSON.stringify(cart));
      var count = cart.reduce(function(s, i) { return s + (i.qty || 1); }, 0);
      document.querySelectorAll('#navCartBadge, .nav-cart-badge').forEach(function(b) { b.textContent = count; });
    } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
