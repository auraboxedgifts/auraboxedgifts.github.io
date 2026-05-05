// Lightbox — pure JS image viewer with keyboard + swipe support
(function() {
  let images = [];
  let currentIndex = 0;
  let lightbox, lbImg, lbCounter;
  let touchStartX = 0;
  let autoPlayInterval = null;

  function init() {
    // Create lightbox DOM
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <button class="lightbox-prev" aria-label="Previous">&#8249;</button>
      <img class="lightbox-img" src="" alt="Product image">
      <button class="lightbox-next" aria-label="Next">&#8250;</button>
      <div class="lightbox-counter"></div>
    `;
    document.body.appendChild(lightbox);

    lbImg = lightbox.querySelector('.lightbox-img');
    lbCounter = lightbox.querySelector('.lightbox-counter');

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

    // Bind all gallery items
    document.querySelectorAll('.col-item').forEach(function(item, i) {
      item.addEventListener('click', function() { open(i); });
    });

    // Collect image sources
    images = Array.from(document.querySelectorAll('.col-item img')).map(function(img) {
      return img.src;
    });

    // Handle AI AutoPlay Navigation
    if (window.location.hash.includes('autoplay=true') && images.length > 0) {
      // Delay slightly to let the iframe animation finish before showing lightbox
      setTimeout(() => {
        open(0);
        startAutoPlay();
      }, 600);
    }
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoPlayInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      show(true); // Animate to next
    }, 3500); // Swipe every 3.5 seconds
  }

  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      autoPlayInterval = null;
    }
  }

  function open(index) {
    currentIndex = index;
    show(false); // No animation on initial open
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    stopAutoPlay();
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function prev() {
    stopAutoPlay();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    show(true);
  }

  function next() {
    stopAutoPlay();
    currentIndex = (currentIndex + 1) % images.length;
    show(true);
  }

  function show(animate = false) {
    if (animate) {
      // Smooth fade transition
      lbImg.style.transition = 'opacity 0.4s ease-in-out, transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      lbImg.style.opacity = '0';
      lbImg.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        lbImg.src = images[currentIndex];
        lbImg.onload = () => {
          lbImg.style.opacity = '1';
          lbImg.style.transform = 'scale(1)';
        };
        lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
      }, 400);
    } else {
      // Instant switch
      lbImg.style.transition = 'none';
      lbImg.style.opacity = '1';
      lbImg.style.transform = 'scale(1)';
      lbImg.src = images[currentIndex];
      lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
