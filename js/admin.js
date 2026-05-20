(function () {
  function getAdminToken() {
    return localStorage.getItem('auraAdminToken') || null;
  }

  function closeAdminModal() {
    const modal = document.getElementById('auraAdminModal');
    if (modal) modal.style.display = 'none';
    if (window.location.hash === '#admin') history.back();
  }

  function ensureAdminModal() {
    let modal = document.getElementById('auraAdminModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'auraAdminModal';
    modal.className = 'aura-auth-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="aura-auth-card aura-admin-card">
        <div class="aura-auth-header">
          <h3>Admin Console</h3>
          <button class="aura-auth-close" id="adminCloseBtn" aria-label="Close">&times;</button>
        </div>
        <div id="adminLoginBlock">
          <p class="aura-auth-subtitle">Manage products and catalog. Uses ADMIN_EMAIL / ADMIN_PASSWORD from server .env.</p>
          <div class="ck-field"><input type="email" id="adminEmail" placeholder="Admin email"></div>
          <div class="ck-field"><input type="password" id="adminPassword" placeholder="Admin password"></div>
          <button class="ck-pay-now-btn" id="adminLoginBtn">Login</button>
        </div>
        <div id="adminPanelBlock" style="display:none;">
          <div class="aura-admin-toolbar">
            <button class="ck-pay-now-btn secondary" id="adminRefreshBtn">Refresh</button>
            <button class="ck-pay-now-btn" id="adminLogoutBtn">Logout</button>
          </div>
          <div class="aura-admin-table-wrap">
            <table class="aura-admin-table" id="adminProductsTable">
              <thead><tr><th>Name</th><th>Collection</th><th>Price</th><th>Action</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#adminCloseBtn').addEventListener('click', closeAdminModal);
    modal.querySelector('#adminLoginBtn').addEventListener('click', adminLogin);
    modal.querySelector('#adminRefreshBtn').addEventListener('click', loadProducts);
    modal.querySelector('#adminLogoutBtn').addEventListener('click', adminLogout);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeAdminModal();
    });
    return modal;
  }

  async function adminLogin() {
    const modal = ensureAdminModal();
    const email = modal.querySelector('#adminEmail').value.trim();
    const password = modal.querySelector('#adminPassword').value;
    try {
      const res = await AuraApi.apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        authToken: null
      });
      const token = res.data?.token || res.token;
      if (!token) throw new Error('No admin token returned');
      localStorage.setItem('auraAdminToken', token);
      await loadProducts();
      showAdminPanel(true);
    } catch (err) {
      alert(`Admin login failed: ${err.message}`);
    }
  }

  function adminLogout() {
    localStorage.removeItem('auraAdminToken');
    showAdminPanel(false);
  }

  function showAdminPanel(show) {
    const modal = ensureAdminModal();
    modal.querySelector('#adminLoginBlock').style.display = show ? 'none' : '';
    modal.querySelector('#adminPanelBlock').style.display = show ? '' : 'none';
  }

  async function loadProducts() {
    const token = getAdminToken();
    if (!token) {
      showAdminPanel(false);
      return;
    }
    const modal = ensureAdminModal();
    const tbody = modal.querySelector('#adminProductsTable tbody');
    try {
      const res = await AuraApi.apiFetch('/api/admin/products', { authToken: token });
      const products = res.data || [];
      tbody.innerHTML = products.map((p) => `
        <tr>
          <td><input data-field="name" data-id="${p.id}" value="${p.name}"></td>
          <td><input data-field="collection" data-id="${p.id}" value="${p.collection}"></td>
          <td><input data-field="price" data-id="${p.id}" value="${p.price}"></td>
          <td><button class="aura-admin-save" data-save-id="${p.id}">Save</button></td>
        </tr>
      `).join('');
      tbody.querySelectorAll('button[data-save-id]').forEach((btn) => {
        btn.addEventListener('click', async function () {
          const id = this.dataset.saveId;
          const rowInputs = Array.from(tbody.querySelectorAll(`input[data-id="${id}"]`));
          const payload = {};
          rowInputs.forEach((input) => { payload[input.dataset.field] = input.value; });
          payload.price = Number(payload.price);
          await AuraApi.apiFetch(`/api/admin/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
            authToken: token
          });
          this.textContent = 'Saved ✓';
          setTimeout(() => { this.textContent = 'Save'; }, 1500);
        });
      });
      showAdminPanel(true);
    } catch (err) {
      localStorage.removeItem('auraAdminToken');
      showAdminPanel(false);
      alert(`Admin session expired: ${err.message}`);
    }
  }

  function openAdminModal() {
    const modal = ensureAdminModal();
    modal.style.display = 'flex';
    history.pushState({ auraOverlay: 'admin' }, '', '#admin');
    if (getAdminToken()) loadProducts();
    else showAdminPanel(false);
  }

  function ensureAdminIcon() {
    const navIcons = document.querySelector('.nav-icons');
    const colNavLinks = document.querySelector('.col-nav-links');
    const host = navIcons || colNavLinks;
    if (!host) return null;
    let btn = document.getElementById('navAdminIcon');
    if (!btn) {
      btn = document.createElement('a');
      btn.href = '#';
      btn.id = 'navAdminIcon';
      btn.title = 'Admin';
      btn.setAttribute('aria-label', 'Admin');
      btn.className = 'aura-admin-icon';
      btn.style.display = 'none';
      btn.innerHTML = '<i class="fas fa-user-shield"></i>';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openAdminModal();
      });
      if (navIcons) navIcons.appendChild(btn);
      else colNavLinks.appendChild(btn);
    }
    return btn;
  }

  async function updateAdminIcon() {
    const btn = ensureAdminIcon();
    if (!btn) return;
    let show = Boolean(getAdminToken());
    if (!show && window.AuraAuth && typeof window.AuraAuth.getUser === 'function') {
      const u = window.AuraAuth.getUser();
      if (u?.isAdmin) show = true;
    }
    if (!show && window.AuraAuth?.refreshUser) {
      const u = await window.AuraAuth.refreshUser();
      show = Boolean(u?.isAdmin);
    }
    btn.style.display = show ? '' : 'none';
  }

  window.addEventListener('popstate', function () {
    if (window.location.hash !== '#admin') {
      const modal = document.getElementById('auraAdminModal');
      if (modal) modal.style.display = 'none';
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    ensureAdminIcon();
    updateAdminIcon();
  });

  window.AuraAdmin = { openAdminModal, updateAdminIcon };
})();
