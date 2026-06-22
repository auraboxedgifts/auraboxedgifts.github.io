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
let slides = [];
let dots = [];
let currentSlide = 0;
let slideInterval;

function goToSlide(index) {
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
  currentSlide = index;
  slides[currentSlide].classList.add('active');
  if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function nextSlide() {
  if (slides.length) goToSlide((currentSlide + 1) % slides.length);
}

function startSlider() {
  clearInterval(slideInterval);
  if (slides.length > 1) slideInterval = setInterval(nextSlide, 5000);
}

function initHeroSlider() {
  const sliderEl = document.getElementById('heroSlider');
  const dotsEl = document.getElementById('heroDots');
  slides = Array.from(document.querySelectorAll('.hero-slide'));
  dots = Array.from(document.querySelectorAll('.hero-dot'));
  currentSlide = 0;
  slides.forEach((s, i) => s.classList.toggle('active', i === 0));
  dots.forEach((d, i) => d.classList.toggle('active', i === 0));
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(slideInterval);
      goToSlide(parseInt(dot.dataset.slide));
      startSlider();
    });
  });
  startSlider();

  // Try to hydrate slides from the live site config (admin-managed)
  if (window.AuraApi && window.AuraApi.apiFetch && sliderEl && dotsEl) {
    window.AuraApi.apiFetch('/api/site')
      .then((resp) => {
        const heroSlides = (resp.data && resp.data.hero && resp.data.hero.slides) || [];
        if (!heroSlides.length) return;
        sliderEl.innerHTML = heroSlides.map((s, i) => `
          <div class="hero-slide${i === 0 ? ' active' : ''}">
            <img src="${window.AuraApi.resolveAssetPath(s.image)}" alt="${(s.alt || 'Aura Boxed Gifts').replace(/"/g, '&quot;')}"${i === 0 ? '' : ' loading="lazy"'}>
          </div>`).join('');
        dotsEl.innerHTML = heroSlides.map((s, i) => `<button class="hero-dot${i === 0 ? ' active' : ''}" data-slide="${i}"></button>`).join('');
        initHeroSliderControls();
      })
      .catch(() => { /* keep static fallback slides */ });
  }
}

function initHeroSliderControls() {
  clearInterval(slideInterval);
  slides = Array.from(document.querySelectorAll('.hero-slide'));
  dots = Array.from(document.querySelectorAll('.hero-dot'));
  currentSlide = 0;
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(slideInterval);
      goToSlide(parseInt(dot.dataset.slide));
      startSlider();
    });
  });
  startSlider();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHeroSlider);
} else {
  initHeroSlider();
}

// ─── SCROLL REVEAL ───
const revealElements = document.querySelectorAll('.reveal');
const auraIoElements = document.querySelectorAll('.aura-io-hidden');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      if (entry.target.classList.contains('reveal')) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, index * 80);
      } else {
        entry.target.classList.add('aura-io-visible');
      }
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));
auraIoElements.forEach(el => revealObserver.observe(el));

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
// ─── TRENDING HAMPERS ───
document.addEventListener('DOMContentLoaded', () => {
    const hampersContainer = document.getElementById('hampersContainer');
    if (!hampersContainer) return;

    const INSTAGRAM_URL = 'https://www.instagram.com/aura_boxedgifts?utm_source=qr&igsh=MTYwbTYzNjJ6anUwdA==';
    const resolve = (src) => (window.AuraApi && window.AuraApi.resolveAssetPath ? window.AuraApi.resolveAssetPath(src) : src);
    const esc = (str) => String(str == null ? '' : str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const FALLBACK_HAMPERS = [
      { id: 'hamper_mom_to_be', title: 'Mom-to-be Hamper Gift', subtitle: 'Customised', image: 'images/hampers/mom-to-be.jpeg', price: 1999 },
      { id: 'hamper_wedding_gift', title: 'Wedding Hamper Gift', subtitle: 'Customised', image: 'images/hampers/wedding-gift.jpeg', price: 2499 },
      { id: 'hamper_birthday', title: 'Customised Birthday Hamper', subtitle: 'Personalised', image: 'images/hampers/birthday-customised.jpeg', price: 1499 },
      { id: 'hamper_virat_kohli', title: 'Customised Virat Kohli Fangirl Hamper', subtitle: 'Personalised', image: 'images/hampers/virat-kohli-fangirl.jpeg', price: 1799 },
      { id: 'hamper_mens_birthday', title: "Customised Men's Birthday Hamper", subtitle: 'Personalised', image: 'images/hampers/mens-birthday.jpeg', price: 1999 },
      { id: 'hamper_mothers_day', title: "Customised Mother's Day Hamper", subtitle: 'Personalised', image: 'images/hampers/mothers-day.jpeg', price: 1899 },
      { id: 'hamper_wedding_bride', title: 'Wedding Hamper for Bride', subtitle: 'Customised', image: 'images/hampers/wedding-bride.jpeg', price: 2299 },
      { id: 'hamper_babygirl_1st_birthday', title: '1st Birthday Hamper Gift for Babygirl', subtitle: 'Customised', image: 'images/hampers/babygirl-1st-birthday.jpeg', price: 1599 }
    ];

    const fmtPrice = (p) => (Number(p) > 0 ? '₹' + Number(p).toLocaleString('en-IN') : '');

    function addHamperToCart(h, btn) {
      if (window.AuraCart && typeof window.AuraCart.addToCartById === 'function') {
        window.AuraCart.addToCartById(h.id);
      } else if (window.parent !== window) {
        window.parent.postMessage({ type: 'addToCart', productId: h.id }, '*');
      }
      if (btn) {
        const original = btn.innerHTML;
        btn.classList.add('added');
        btn.innerHTML = '<i class="fas fa-check"></i> Added';
        setTimeout(() => { btn.classList.remove('added'); btn.innerHTML = original; }, 1400);
      }
    }

    let currentHampers = [];

    function renderHampers(hampers) {
      currentHampers = hampers || [];
      if (!hampers.length) { hampersContainer.innerHTML = ''; return; }
      hampersContainer.innerHTML = hampers.map((h, idx) => `
        <article class="hamper-card" style="animation-delay: ${idx * 0.08}s" data-index="${idx}">
          <div class="hamper-card-media">
            <img src="${esc(resolve(h.image))}" alt="${esc(h.title)}" loading="lazy">
            ${h.subtitle ? `<span class="hamper-badge">${esc(h.subtitle)}</span>` : ''}
            <div class="hamper-card-overlay">
              <button class="hamper-view-btn" data-index="${idx}"><i class="fas fa-expand"></i> Quick view</button>
            </div>
          </div>
          <div class="hamper-card-info">
            <h3 class="hamper-card-title">${esc(h.title)}</h3>
            ${fmtPrice(h.price) ? `<div class="hamper-card-price">${fmtPrice(h.price)}</div>` : ''}
            <button class="hamper-add-btn" data-add="${idx}"><i class="fas fa-bag-shopping"></i> Add to cart</button>
          </div>
        </article>
      `).join('');

      hampersContainer.querySelectorAll('.hamper-card-media, .hamper-view-btn').forEach((el) => {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          const idx = Number(this.dataset.index || this.closest('[data-index]').dataset.index || 0);
          openHamperLightbox(hampers, idx);
        });
      });

      hampersContainer.querySelectorAll('.hamper-add-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          addHamperToCart(hampers[Number(this.dataset.add || 0)], this);
        });
      });
    }

    function openHamperLightbox(hampers, startIndex) {
      let lb = document.getElementById('hamperLightbox');
      if (!lb) {
        lb = document.createElement('div');
        lb.id = 'hamperLightbox';
        lb.className = 'hamper-lightbox';
        lb.innerHTML = `
          <button class="hamper-lb-close" aria-label="Close">&times;</button>
          <button class="hamper-lb-nav hamper-lb-prev" aria-label="Previous">&#8249;</button>
          <div class="hamper-lb-stage">
            <img class="hamper-lb-img" src="" alt="">
            <div class="hamper-lb-info">
              <h3 class="hamper-lb-title"></h3>
              <div class="hamper-lb-price"></div>
              <p class="hamper-lb-sub">Fully customisable — choose your theme, colours, and items.</p>
              <button class="hamper-lb-cta"><i class="fas fa-bag-shopping"></i> Add to cart</button>
              <a class="hamper-lb-customise" href="${INSTAGRAM_URL}" target="_blank" rel="noopener"><i class="fab fa-instagram"></i> Or customise on Instagram</a>
            </div>
          </div>
          <button class="hamper-lb-nav hamper-lb-next" aria-label="Next">&#8250;</button>
          <div class="hamper-lb-counter"></div>`;
        document.body.appendChild(lb);
        lb.querySelector('.hamper-lb-close').addEventListener('click', closeHamperLightbox);
        lb.addEventListener('click', (e) => { if (e.target === lb) closeHamperLightbox(); });
      }
      let current = startIndex;
      const imgEl = lb.querySelector('.hamper-lb-img');
      const titleEl = lb.querySelector('.hamper-lb-title');
      const priceEl = lb.querySelector('.hamper-lb-price');
      const ctaEl = lb.querySelector('.hamper-lb-cta');
      const counterEl = lb.querySelector('.hamper-lb-counter');
      function show(i) {
        current = (i + hampers.length) % hampers.length;
        const h = hampers[current];
        imgEl.src = resolve(h.image);
        imgEl.alt = h.title;
        titleEl.textContent = h.title;
        priceEl.textContent = fmtPrice(h.price);
        priceEl.style.display = fmtPrice(h.price) ? '' : 'none';
        counterEl.textContent = `${current + 1} / ${hampers.length}`;
      }
      ctaEl.onclick = (e) => { e.preventDefault(); addHamperToCart(hampers[current], ctaEl); };
      lb.querySelector('.hamper-lb-prev').onclick = () => show(current - 1);
      lb.querySelector('.hamper-lb-next').onclick = () => show(current + 1);
      show(startIndex);
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeHamperLightbox() {
      const lb = document.getElementById('hamperLightbox');
      if (lb) lb.classList.remove('active');
      document.body.style.overflow = '';
    }

    // Exposed so Aura AI can open a specific hamper by id or index.
    window.AuraHampers = {
      list: () => currentHampers.slice(),
      openByIndex: (i) => {
        if (!currentHampers.length) return false;
        const idx = Math.max(0, Math.min(currentHampers.length - 1, Number(i) || 0));
        openHamperLightbox(currentHampers, idx);
        return true;
      },
      openById: (id) => {
        const idx = currentHampers.findIndex((h) => h.id === id);
        if (idx === -1) return false;
        openHamperLightbox(currentHampers, idx);
        return true;
      },
      openByTitle: (title) => {
        if (!currentHampers.length || !title) return false;
        const needle = String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        const idx = currentHampers.findIndex((h) => {
          const t = String(h.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          return t === needle || t.includes(needle) || needle.includes(t);
        });
        if (idx === -1) return false;
        openHamperLightbox(currentHampers, idx);
        return true;
      }
    };

    if (window.AuraApi && window.AuraApi.apiFetch) {
      window.AuraApi.apiFetch('/api/hampers')
        .then((resp) => {
          const hampers = (resp.data && resp.data.length) ? resp.data : FALLBACK_HAMPERS;
          renderHampers(hampers);
        })
        .catch(() => renderHampers(FALLBACK_HAMPERS));
    } else {
      renderHampers(FALLBACK_HAMPERS);
    }

    // Dynamic collections hydration
    initCollectionsGrid();
});

// ─── ABOUT / OUR STORY (editable via admin) ───
document.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.getElementById('aboutTitle');
  if (!titleEl || !(window.AuraApi && window.AuraApi.apiFetch)) return;

  const esc = (str) => String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Turn admin plain text into safe HTML: blank lines -> paragraphs, single newlines -> <br>.
  function bodyToHtml(text) {
    return String(text || '')
      .split(/\n\s*\n/)
      .map((block) => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  window.AuraApi.apiFetch('/api/site')
    .then((resp) => {
      const about = resp.data && resp.data.about;
      if (!about) return;
      const labelEl = document.getElementById('aboutLabel');
      const bodyEl = document.getElementById('aboutBody');
      const imgEl = document.getElementById('aboutImage');
      const ctaEl = document.getElementById('aboutCta');
      if (labelEl && about.label) labelEl.textContent = about.label;
      if (about.title) titleEl.textContent = about.title;
      if (bodyEl && about.body) bodyEl.innerHTML = bodyToHtml(about.body);
      if (imgEl && about.image) {
        imgEl.src = window.AuraApi.resolveAssetPath(about.image);
      }
      if (ctaEl) {
        if (about.ctaText) ctaEl.textContent = about.ctaText;
        if (about.ctaLink) ctaEl.href = about.ctaLink;
      }
    })
    .catch(() => {});
});

function initCollectionsGrid() {
  const gridEl = document.getElementById('collectionsGrid');
  const footerListEl = document.getElementById('footerCollectionsList');
  if (!gridEl && !footerListEl) return;

  const FALLBACK_COLLECTIONS = [
    { slug: 'bracelets', name: 'Bracelets' },
    { slug: 'pendants', name: 'Pendants' },
    { slug: 'earrings', name: 'Earrings' },
    { slug: 'jhumkas', name: 'Jhumkas' },
    { slug: 'scrunchies', name: 'Scrunchies' },
    { slug: 'claws', name: 'Claws' },
    { slug: 'hairbows', name: 'Hair Bows' },
    { slug: 'rings', name: 'Rings' },
    { slug: 'keychains', name: 'Keychains' },
    { slug: 'makeup', name: 'Makeup / Chocolates' },
    { slug: 'luxury-hampers', name: 'Luxury Hampers' },
    { slug: 'affordable-hampers', name: 'Affordable Hampers' }
  ];

  const COLLECTION_IMAGES = {
    bracelets: 'images/web/bracelets-1.jpeg',
    pendants: 'images/web/pendents-1.jpeg',
    earrings: 'images/web/earings-1.jpeg',
    jhumkas: 'images/web/earings-3.jpeg',
    scrunchies: 'images/web/scrunchies-1.jpeg',
    claws: 'images/web/hairclaws-1.jpeg',
    hairbows: 'images/web/aligator-hairpins-1.jpeg',
    rings: 'images/web/jwellery-case-1.jpeg',
    keychains: 'images/web/mini-bags-1.jpeg',
    makeup: 'images/web/lip-gloss-2.jpeg',
    'luxury-hampers': 'images/web/eyeshadow-palette-1.jpeg',
    'affordable-hampers': 'images/web/highlighter-1.jpeg'
  };

  const resolve = (src) => (window.AuraApi && window.AuraApi.resolveAssetPath ? window.AuraApi.resolveAssetPath(src) : src);
  const esc = (str) => String(str == null ? '' : str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function render(list) {
    if (gridEl) {
      gridEl.innerHTML = list.map((c) => {
        const imgUrl = c.image || COLLECTION_IMAGES[c.slug] || `images/web/${c.slug}-1.jpeg`;
        return `
          <a href="collections/${esc(c.slug)}.html" class="collection-card reveal">
            <img src="${esc(resolve(imgUrl))}" alt="${esc(c.name)} Collection">
            <div class="collection-card-overlay">
              <h3 class="collection-card-name">${esc(c.name)}</h3>
              <span class="collection-card-cta">View Collection →</span>
            </div>
          </a>`;
      }).join('');
    }

    if (footerListEl) {
      footerListEl.innerHTML = list.slice(0, 6).map((c) => {
        return `<li><a href="collections/${esc(c.slug)}.html">${esc(c.name)}</a></li>`;
      }).join('');
    }

    if (typeof revealObserver !== 'undefined' && gridEl) {
      gridEl.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
    }
  }

  if (window.AuraApi && window.AuraApi.apiFetch) {
    window.AuraApi.apiFetch('/api/collections')
      .then((resp) => {
        const list = (resp.data && resp.data.length) ? resp.data : FALLBACK_COLLECTIONS;
        render(list);
      })
      .catch(() => render(FALLBACK_COLLECTIONS));
  } else {
    render(FALLBACK_COLLECTIONS);
  }
}
