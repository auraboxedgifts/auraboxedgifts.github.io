(function () {
  let images = [];
  let currentIndex = 0;
  let lightbox;

  function buildImages() {
    images = Array.from(document.querySelectorAll('.col-item')).map(function (item) {
      const img = item.querySelector('img');
      return {
        idx: Number(item.dataset.idx || 0),
        productId: item.dataset.id || '',
        src: img ? img.src : '',
        name: item.dataset.name || '',
        price: Number(item.dataset.price || 0),
        description: item.dataset.description || '',
        img: item.dataset.img || (img ? img.getAttribute('src') : '')
      };
    });
  }

  function updateInfo() {
    const p = images[currentIndex];
    if (!p) return;
    lightbox.querySelector('.lightbox-img').src = p.src;
    lightbox.querySelector('#lbProductName').textContent = p.name;
    lightbox.querySelector('#lbProductPrice').textContent = `Rs. ${p.price}.00`;
    lightbox.querySelector('#lbProductDesc').textContent = p.description || '';
    lightbox.querySelector('.lightbox-counter').textContent = `${currentIndex + 1} / ${images.length}`;

    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'context_update',
        productId: p.productId,
        productName: p.name,
        productPrice: p.price,
        productImg: p.img
      }, '*');
    }
  }

  function openLightbox(index) {
    currentIndex = Math.max(0, Math.min(images.length - 1, Number(index || 0)));
    updateInfo();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function next() {
    currentIndex = (currentIndex + 1) % images.length;
    updateInfo();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateInfo();
  }

  function init() {
    buildImages();
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
        <span class="lightbox-product-price" id="lbProductDesc"></span>
        <button class="btn-add-cart" id="lbAddToCartBtn"><i class="fas fa-shopping-cart"></i> Add to cart</button>
      </div>
      <div class="lightbox-counter"></div>`;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.querySelector('.lightbox-next').addEventListener('click', next);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', prev);
    lightbox.querySelector('#lbAddToCartBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      const p = images[currentIndex];
      AuraCart.addToCartById(p.productId);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'context_update', action: 'added_to_cart', productName: p.name, productPrice: p.price }, '*');
      }
    });

    document.querySelectorAll('.col-item').forEach(function (item, i) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.btn-add-cart')) return;
        openLightbox(i);
      });
    });
    document.querySelectorAll('.btn-add-cart').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const idx = Number(btn.dataset.addIdx || 0);
        const p = images[idx];
        if (window.parent !== window) {
          window.parent.postMessage({ type: 'addToCart', productId: p.productId, item: p.name, img: p.img, price: p.price }, '*');
        } else {
          AuraCart.addToCartById(p.productId);
        }
      });
    });

    window.addEventListener('message', function (e) {
      if (!e.data) return;
      if (e.data.type === 'next_product') {
        if (!lightbox.classList.contains('active')) openLightbox(0);
        else next();
      } else if (e.data.type === 'previous_product') {
        if (!lightbox.classList.contains('active')) openLightbox(0);
        else prev();
      } else if (e.data.type === 'view_product') {
        const index = Math.max(0, Number(e.data.index || 1) - 1);
        openLightbox(index);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
