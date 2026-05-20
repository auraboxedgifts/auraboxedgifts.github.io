// ─── NAVBAR SCROLL EFFECT ───
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ─── MOBILE NAV ───
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
const mobileNavClose = document.getElementById('mobileNavClose');

hamburger.addEventListener('click', () => {
  mobileNav.classList.add('active');
  document.body.style.overflow = 'hidden';
});

function closeMobileNav() {
  mobileNav.classList.remove('active');
  document.body.style.overflow = '';
}
mobileNavClose.addEventListener('click', closeMobileNav);

// ─── HERO SLIDER ───
const slides = document.querySelectorAll('.hero-slide');
const dots = document.querySelectorAll('.hero-dot');
let currentSlide = 0;
let slideInterval;

function goToSlide(index) {
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = index;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

function nextSlide() {
  goToSlide((currentSlide + 1) % slides.length);
}

function startSlider() {
  slideInterval = setInterval(nextSlide, 5000);
}

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    clearInterval(slideInterval);
    goToSlide(parseInt(dot.dataset.slide));
    startSlider();
  });
});

startSlider();

// ─── SCROLL REVEAL ───
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, index * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// ─── SMOOTH SCROLL FOR NAV LINKS ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return; // Ignore empty anchor links used for UI toggles
    
    try {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      // Catch any invalid selector errors gracefully
    }
  });
});

// ─── HELPER: SCROLL TO GALLERY ───
function scrollToGallery(category) {
  const gallery = document.getElementById('gallery');
  if (gallery) {
    gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─── PARALLAX EFFECT ON HERO ───
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero');
  if (hero) {
    const scrolled = window.scrollY;
    const overlay = hero.querySelector('.hero-overlay');
    if (overlay && scrolled < hero.offsetHeight) {
      overlay.style.transform = `translateY(${scrolled * 0.3}px)`;
      overlay.style.opacity = 1 - (scrolled / hero.offsetHeight) * 0.5;
    }
  }
});
// ─── RANDOM FEATURED PRODUCTS ───
document.addEventListener('DOMContentLoaded', () => {
    const featuredContainer = document.getElementById('randomProductsContainer');
    if (!featuredContainer) return;
    if (!window.AuraApi || !window.AuraApi.apiFetch) return;

    function renderProducts(products) {
      featuredContainer.innerHTML = products.map((p, idx) => `
        <div class="featured-item" style="animation-delay: ${idx * 0.1}s">
            <img src="${window.AuraApi.resolveAssetPath(p.image)}" alt="${p.name}" loading="lazy">
          <div class="featured-info">
            <h3 class="featured-title">${p.name}</h3>
            <p class="featured-price">Rs. ${p.price}.00</p>
            <button class="featured-add-btn" data-product-id="${p.id}"><i class="fas fa-shopping-cart"></i> Add to cart</button>
          </div>
        </div>
      `).join('');
      featuredContainer.querySelectorAll('.featured-add-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
          if (window.AuraCart) window.AuraCart.addToCartById(btn.dataset.productId);
        });
      });
    }

    window.AuraApi.apiFetch('/api/products?featured=true')
      .then((resp) => {
        const products = (resp.data || [])
          .slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, 4);
        renderProducts(products);
      })
      .catch(() => {
        const fallback = [
          { id: 'pend_1', name: 'Butterfly Pendant Necklace', price: 599, image: 'images/web/pendents-1.jpeg' },
          { id: 'bracelet_2', name: 'Rainbow Charm Beaded Bracelet Set', price: 699, image: 'images/web/bracelets-2.jpeg' },
          { id: 'earring_3', name: 'Party Glam Earrings', price: 499, image: 'images/web/earings-3.jpeg' },
          { id: 'key_1', name: 'Mini Bag Keychain - Pastel', price: 299, image: 'images/web/mini-bags-1.jpeg' }
        ].sort(() => Math.random() - 0.5);
        renderProducts(fallback);
      });
});
