(function () {
  function getAdminToken() {
    return localStorage.getItem('auraAdminToken') || null;
  }

  function ensureAdminModal() {
    let modal = document.getElementById('auraAdminModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'auraAdminModal';
    modal.className = 'aura-auth-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="aura-auth-card" style="max-width:900px;">
        <div class="aura-auth-header">
          <h3>Admin Console</h3>
          <button class="aura-auth-close" id="adminCloseBtn" aria-label="Close">&times;</button>
        </div>
        <div id="adminLoginBlock">
          <p class="aura-auth-subtitle">Login as admin to manage products.</p>
          <div class="ck-field"><input type="email" id="adminEmail" placeholder="Admin email"></div>
          <div class="ck-field"><input type="password" id="adminPassword" placeholder="Admin password"></div>
          <button class="ck-pay-now-btn" id="adminLoginBtn">Login</button>
        </div>
        <div id="adminPanelBlock" style="display:none;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin:8px 0 10px;">
            <button class="ck-pay-now-btn secondary" id="adminRefreshBtn" style="width:auto;padding:10px 14px;margin:0;">Refresh</button>
            <button class="ck-pay-now-btn" id="adminLogoutBtn" style="width:auto;padding:10px 14px;margin:0;">Logout</button>
          </div>
          <div style="max-height:420px;overflow:auto;border:1px solid #eee;border-radius:10px;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;" id="adminProductsTable">
              <thead><tr><th style="text-align:left;padding:8px;">Name</th><th style="text-align:left;padding:8px;">Collection</th><th style="text-align:left;padding:8px;">Price</th><th style="text-align:left;padding:8px;">Action</th></tr></thead>
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
          <td style="padding:8px;"><input data-field="name" data-id="${p.id}" value="${p.name}" style="width:100%"></td>
          <td style="padding:8px;"><input data-field="collection" data-id="${p.id}" value="${p.collection}" style="width:100%"></td>
          <td style="padding:8px;"><input data-field="price" data-id="${p.id}" value="${p.price}" style="width:90px"></td>
          <td style="padding:8px;"><button data-save-id="${p.id}" style="padding:6px 10px;">Save</button></td>
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
    if (getAdminToken()) loadProducts();
    else showAdminPanel(false);
  }

  document.addEventListener('DOMContentLoaded', function () {
    const navIcons = document.querySelector('.nav-icons');
    if (!navIcons) return;
    const adminBtn = document.createElement('a');
    adminBtn.href = '#';
    adminBtn.title = 'Admin';
    adminBtn.setAttribute('aria-label', 'Admin');
    adminBtn.innerHTML = '<i class="fas fa-user-shield"></i>';
    adminBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openAdminModal();
    });
    navIcons.appendChild(adminBtn);
  });

  window.AuraAdmin = { openAdminModal };
})();
