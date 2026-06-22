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

  function setAuthStep(modal, step) {
    modal.dataset.step = step;
    modal.querySelector('#authEmailBlock').style.display = step === 'email' ? '' : 'none';
    modal.querySelector('#authPasswordLoginBlock').style.display = step === 'password' ? '' : 'none';
    modal.querySelector('#authOtpBlock').style.display = step === 'otp' ? '' : 'none';
    modal.querySelector('#authSetPasswordBlock').style.display = step === 'setPassword' ? '' : 'none';
    modal.querySelector('#authForgotOtpBlock').style.display = step === 'forgotOtp' ? '' : 'none';
    modal.querySelector('#authResetPasswordBlock').style.display = step === 'resetPassword' ? '' : 'none';
    const subtitle = modal.querySelector('.aura-auth-subtitle');
    if (step === 'email') subtitle.textContent = 'Enter your email to continue.';
    if (step === 'password') subtitle.textContent = 'Welcome back — enter your password.';
    if (step === 'otp') subtitle.textContent = 'First time? Verify with the OTP sent to your email.';
    if (step === 'setPassword') subtitle.textContent = 'Create your account profile.';
    if (step === 'forgotOtp') subtitle.textContent = 'Enter the OTP sent to your email to reset password.';
    if (step === 'resetPassword') subtitle.textContent = 'Choose a new password for your account.';
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
        <p class="aura-auth-subtitle">Enter your email to continue.</p>
        <div id="authEmailBlock">
          <div class="ck-field"><input type="email" id="authEmailInput" placeholder="Email" autocomplete="email"></div>
          <button class="ck-pay-now-btn" id="authContinueBtn">Continue</button>
        </div>
        <div id="authPasswordLoginBlock" style="display:none;">
          <div class="ck-field"><input type="password" id="authPasswordInput" placeholder="Password" autocomplete="current-password"></div>
          <button class="ck-pay-now-btn" id="authPasswordLoginBtn">Login with password</button>
          <div style="display: flex; justify-content: space-between; margin-top: 8px;">
            <button class="ck-back-btn aura-auth-resend" id="authUseOtpBtn" style="margin: 0; padding: 4px 8px;">Use OTP instead</button>
            <button class="ck-back-btn aura-auth-resend" id="authForgotBtn" style="margin: 0; padding: 4px 8px;">Forgot password?</button>
          </div>
        </div>
        <div id="authOtpBlock" style="display:none;">
          <div class="ck-field"><input type="text" id="authOtpInput" placeholder="Enter 6-digit OTP" inputmode="numeric"></div>
          <button class="ck-pay-now-btn" id="authVerifyOtpBtn">Verify OTP</button>
          <button class="ck-back-btn aura-auth-resend" id="authResendBtn">Resend OTP</button>
        </div>
        <div id="authSetPasswordBlock" style="display:none;">
          <div class="ck-field"><input type="text" id="authSetNameInput" placeholder="Full Name" autocomplete="name"></div>
          <div class="ck-field"><input type="password" id="authNewPasswordInput" placeholder="New password (min 6 chars)" autocomplete="new-password"></div>
          <div class="ck-field"><input type="password" id="authConfirmPasswordInput" placeholder="Confirm password" autocomplete="new-password"></div>
          <button class="ck-pay-now-btn" id="authSetPasswordBtn">Save & login</button>
        </div>
        <div id="authForgotOtpBlock" style="display:none;">
          <div class="ck-field"><input type="text" id="authForgotOtpInput" placeholder="Enter 6-digit OTP" inputmode="numeric"></div>
          <button class="ck-pay-now-btn" id="authVerifyForgotOtpBtn">Verify OTP</button>
          <button class="ck-back-btn aura-auth-resend" id="authForgotResendBtn">Resend OTP</button>
        </div>
        <div id="authResetPasswordBlock" style="display:none;">
          <div class="ck-field"><input type="password" id="authResetPasswordInput" placeholder="New password (min 6 chars)" autocomplete="new-password"></div>
          <div class="ck-field"><input type="password" id="authResetConfirmPasswordInput" placeholder="Confirm new password" autocomplete="new-password"></div>
          <button class="ck-pay-now-btn" id="authResetPasswordBtn">Reset password</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#authCloseBtn').addEventListener('click', closeAuthModal);
    modal.querySelector('#authContinueBtn').addEventListener('click', handleAuthContinue);
    modal.querySelector('#authPasswordLoginBtn').addEventListener('click', handlePasswordLogin);
    modal.querySelector('#authUseOtpBtn').addEventListener('click', handleSendOtpFromModal);
    modal.querySelector('#authForgotBtn').addEventListener('click', handleForgotPasswordFlow);
    modal.querySelector('#authVerifyOtpBtn').addEventListener('click', handleVerifyOtp);
    modal.querySelector('#authResendBtn').addEventListener('click', handleResendOtp);
    modal.querySelector('#authSetPasswordBtn').addEventListener('click', handleSetPassword);
    modal.querySelector('#authVerifyForgotOtpBtn').addEventListener('click', handleVerifyForgotOtp);
    modal.querySelector('#authForgotResendBtn').addEventListener('click', handleResendOtp);
    modal.querySelector('#authResetPasswordBtn').addEventListener('click', handleResetPasswordSubmit);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeAuthModal();
    });
    setAuthStep(modal, 'email');
    return modal;
  }

  async function handleAuthContinue() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    if (!email) return;
    const btn = modal.querySelector('#authContinueBtn');
    try {
      btn.disabled = true;
      btn.textContent = 'Checking...';
      const check = await AuraApi.apiFetch('/api/auth/check-email', { method: 'POST', body: JSON.stringify({ email }) });
      if (check.data?.hasPassword) {
        setAuthStep(modal, 'password');
      } else {
        await AuraApi.apiFetch('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
        setAuthStep(modal, 'otp');
      }
    } catch (err) {
      alert(`Could not continue: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Continue';
    }
  }

  async function handlePasswordLogin() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    const password = modal.querySelector('#authPasswordInput').value;
    if (!email || !password) return;
    const btn = modal.querySelector('#authPasswordLoginBtn');
    try {
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      const response = await AuraApi.apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!response.token) throw new Error('Token missing');
      localStorage.setItem('auraAuthToken', response.token);
      user = response.user || null;
      await refreshUser();
      renderAccountState();
      closeAuthModal();
      window.dispatchEvent(new Event('auraAuthSuccess'));
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login with password';
    }
  }

  async function handleForgotPasswordFlow() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    if (!email) return;
    const btn = modal.querySelector('#authForgotBtn');
    try {
      btn.disabled = true;
      btn.textContent = 'Sending OTP...';
      await AuraApi.apiFetch('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
      setAuthStep(modal, 'forgotOtp');
    } catch (err) {
      alert(`Failed to send OTP: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Forgot password?';
    }
  }

  async function handleSendOtpFromModal() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    if (!email) return;
    try {
      await AuraApi.apiFetch('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
      setAuthStep(modal, 'otp');
    } catch (err) {
      alert(`Failed to send OTP: ${err.message}`);
    }
  }

  async function handleVerifyOtp() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    const otp = modal.querySelector('#authOtpInput').value.trim();
    if (!email || !otp) return;
    const btn = modal.querySelector('#authVerifyOtpBtn');
    try {
      btn.disabled = true;
      btn.textContent = 'Verifying...';
      const response = await AuraApi.apiFetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
      if (!response.token) throw new Error('Token missing in verify response');
      localStorage.setItem('auraAuthToken', response.token);
      user = response.user || null;
      if (response.needsPasswordSetup) {
        setAuthStep(modal, 'setPassword');
      } else {
        await refreshUser();
        renderAccountState();
        closeAuthModal();
        window.dispatchEvent(new Event('auraAuthSuccess'));
      }
    } catch (err) {
      alert(`OTP verification failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Verify OTP';
    }
  }

  async function handleVerifyForgotOtp() {
    const modal = ensureAuthModal();
    const otp = modal.querySelector('#authForgotOtpInput').value.trim();
    if (!otp) return;
    setAuthStep(modal, 'resetPassword');
  }

  async function handleResetPasswordSubmit() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    const otp = modal.querySelector('#authForgotOtpInput').value.trim();
    const pw = modal.querySelector('#authResetPasswordInput').value;
    const confirm = modal.querySelector('#authResetConfirmPasswordInput').value;
    if (pw.length < 6) return alert('Password must be at least 6 characters.');
    if (pw !== confirm) return alert('Passwords do not match.');
    const btn = modal.querySelector('#authResetPasswordBtn');
    try {
      btn.disabled = true;
      btn.textContent = 'Resetting...';
      const response = await AuraApi.apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword: pw })
      });
      if (!response.token) throw new Error('Token missing');
      localStorage.setItem('auraAuthToken', response.token);
      user = response.user || null;
      await refreshUser();
      renderAccountState();
      closeAuthModal();
      window.dispatchEvent(new Event('auraAuthSuccess'));
    } catch (err) {
      alert(`Could not reset password: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Reset password';
    }
  }

  async function handleResendOtp() {
    const modal = ensureAuthModal();
    const email = modal.querySelector('#authEmailInput').value.trim().toLowerCase();
    if (!email) return;
    try {
      await AuraApi.apiFetch('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) });
      alert('OTP resent to your email.');
    } catch (err) {
      alert(`Failed to resend OTP: ${err.message}`);
    }
  }

  async function handleSetPassword() {
    const modal = ensureAuthModal();
    const name = modal.querySelector('#authSetNameInput').value.trim();
    const pw = modal.querySelector('#authNewPasswordInput').value;
    const confirm = modal.querySelector('#authConfirmPasswordInput').value;
    if (!name) return alert('Please enter your name.');
    if (pw.length < 6) return alert('Password must be at least 6 characters.');
    if (pw !== confirm) return alert('Passwords do not match.');
    const btn = modal.querySelector('#authSetPasswordBtn');
    try {
      btn.disabled = true;
      btn.textContent = 'Saving...';
      await AuraApi.apiFetch('/api/auth/set-password', { method: 'POST', body: JSON.stringify({ password: pw, name }) });
      await refreshUser();
      renderAccountState();
      closeAuthModal();
      window.dispatchEvent(new Event('auraAuthSuccess'));
    } catch (err) {
      alert(`Could not save password: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save & login';
    }
  }

  function openAuthModal() {
    const modal = ensureAuthModal();
    setAuthStep(modal, 'email');
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
        <button id="navUserDelete" style="background:#ff4b4b;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;margin-top:6px;width:100%;transition:all 0.2s ease;">Delete Account</button>
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
        if (window.AuraAdmin && typeof window.AuraAdmin.updateAdminIcon === 'function') {
          window.AuraAdmin.updateAdminIcon();
        }
      };
      document.getElementById('navUserDelete').onclick = async function () {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
        if (!confirm('This will permanently delete your account and all your data. Type OK to confirm.')) return;
        try {
          await AuraApi.apiFetch('/api/auth/account', { method: 'DELETE' });
          localStorage.removeItem('auraAuthToken');
          user = null;
          dropdown.style.display = 'none';
          renderAccountState();
          alert('Your account has been deleted.');
        } catch (err) {
          alert('Could not delete account: ' + err.message);
        }
      };
    } else {
      icon.onclick = function (e) {
        e.preventDefault();
        openAuthModal();
      };
      dropdown.style.display = 'none';
    }
    if (window.AuraAdmin && typeof window.AuraAdmin.updateAdminIcon === 'function') {
      window.AuraAdmin.updateAdminIcon();
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

  window.AuraAuth = { getUser, refreshUser, openAuthModal, closeAuthModal };
})();
