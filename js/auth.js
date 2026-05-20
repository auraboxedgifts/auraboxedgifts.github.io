(function () {
  let user = null;

  function getUser() {
    return user;
  }

  async function refreshUser() {
    const token = localStorage.getItem('auraAuthToken');
    if (!token) {
      user = null;
      return null;
    }
    try {
      const data = await AuraApi.apiFetch('/api/auth/me');
      user = data.data;
      return user;
    } catch (err) {
      localStorage.removeItem('auraAuthToken');
      user = null;
      return null;
    }
  }

  function ensureAuthModal() {
    let modal = document.getElementById('auraAuthModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'auraAuthModal';
    modal.className = 'aura-auth-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="aura-auth-card">
        <div class="aura-auth-header">
          <h3>Login / Sign up</h3>
          <button class="aura-auth-close" id="authCloseBtn" aria-label="Close">&times;</button>
        </div>
        <p class="aura-auth-subtitle">Enter your email to receive OTP.</p>
        <div class="ck-field"><input type="email" id="authEmailInput" placeholder="Email"></div>
        <button class="ck-pay-now-btn" id="authSendOtpBtn">Send OTP</button>
        <div id="authOtpBlock" style="display:none;margin-top:12px;">
            <div class="ck-field"><input type="text" id="authOtpInput" placeholder="Enter 6-digit OTP"></div>
            <button class="ck-pay-now-btn" id="authVerifyOtpBtn">Verify OTP</button>
            <button class="ck-back-btn aura-auth-resend" id="authResendBtn">Resend OTP</button>
          </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#authCloseBtn').addEventListener('click', closeAuthModal);
    modal.querySelector('#authSendOtpBtn').addEventListener('click', async function () {
      const email = modal.querySelector('#authEmailInput').value.trim();
      if (!email) return;
      await AuraApi.apiFetch('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
      modal.querySelector('#authOtpBlock').style.display = 'block';
    });
    modal.querySelector('#authVerifyOtpBtn').addEventListener('click', async function () {
      const email = modal.querySelector('#authEmailInput').value.trim();
      const otp = modal.querySelector('#authOtpInput').value.trim();
      const response = await AuraApi.apiFetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
      localStorage.setItem('auraAuthToken', response.token);
      await refreshUser();
      renderAccountState();
      closeAuthModal();
    });
    modal.querySelector('#authResendBtn').addEventListener('click', async function () {
      const email = modal.querySelector('#authEmailInput').value.trim();
      if (!email) return;
      await AuraApi.apiFetch('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) });
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeAuthModal();
    });
    return modal;
  }

  function openAuthModal() {
    const modal = ensureAuthModal();
    modal.style.display = 'flex';
    history.pushState({ auraOverlay: 'auth' }, '', '#auth');
  }

  function closeAuthModal() {
    const modal = document.getElementById('auraAuthModal');
    if (modal) modal.style.display = 'none';
    if (window.location.hash === '#auth') history.back();
  }

  function ensureAccountUi() {
    const navIcons = document.querySelector('.nav-icons');
    const colNavLinks = document.querySelector('.col-nav-links');
    if ((!navIcons && !colNavLinks) || document.getElementById('navUserIcon')) return;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.className = 'aura-user-wrapper';
    wrapper.innerHTML = `
      <a href="#" id="navUserIcon" aria-label="Account" class="aura-user-icon"><i class="fas fa-user"></i></a>
      <div id="navUserDropdown" class="aura-user-dropdown" style="display:none;">
        <p id="navUserEmail"></p>
        <button id="navUserLogout">Logout</button>
      </div>`;
    if (navIcons) {
      const cartIcon = document.getElementById('navCartIcon');
      navIcons.insertBefore(wrapper, cartIcon || navIcons.firstChild);
    } else if (colNavLinks) {
      const insta = colNavLinks.querySelector('a[href*="instagram.com"]');
      colNavLinks.insertBefore(wrapper, insta || colNavLinks.firstChild);
    }
  }

  function renderAccountState() {
    ensureAccountUi();
    const icon = document.getElementById('navUserIcon');
    const dropdown = document.getElementById('navUserDropdown');
    if (!icon || !dropdown) return;
    if (user) {
      document.getElementById('navUserEmail').textContent = user.email || '';
      icon.onclick = function (e) {
        e.preventDefault();
        dropdown.style.display = dropdown.style.display === 'none' || !dropdown.style.display ? 'block' : 'none';
      };
      document.getElementById('navUserLogout').onclick = function () {
        localStorage.removeItem('auraAuthToken');
        user = null;
        dropdown.style.display = 'none';
        renderAccountState();
      };
    } else {
      icon.onclick = function (e) {
        e.preventDefault();
        openAuthModal();
      };
      dropdown.style.display = 'none';
    }
  }

  window.addEventListener('popstate', function () {
    if (window.location.hash !== '#auth') {
      const modal = document.getElementById('auraAuthModal');
      if (modal) modal.style.display = 'none';
    }
  });

  document.addEventListener('DOMContentLoaded', async function () {
    await refreshUser();
    renderAccountState();
  });

  window.AuraAuth = { getUser, refreshUser, openAuthModal };
})();
