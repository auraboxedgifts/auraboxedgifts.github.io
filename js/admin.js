(function () {
  const TOKEN_KEY = 'auraAdminToken';
  const state = {
    products: [],
    collections: [],
    site: { hero: { slides: [] }, hampers: [] },
    activeCollection: 'all',
    search: '',
    view: 'products',
    sortDirty: false
  };

  function getAdminToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  function setAdminToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function getUserAuthToken() {
    return localStorage.getItem('auraAuthToken') || null;
  }

  function loggedInUserIsAdmin() {
    const u = window.AuraAuth && typeof window.AuraAuth.getUser === 'function' ? window.AuraAuth.getUser() : null;
    return Boolean(u && u.isAdmin);
  }

  // The admin API accepts any JWT whose role is "admin". A user who signs in
  // with the admin email already holds such a token, so we reuse it instead of
  // forcing a second, separate admin login.
  function getEffectiveAdminToken() {
    return getAdminToken() || (loggedInUserIsAdmin() ? getUserAuthToken() : null);
  }

  function resolveImage(src) {
    if (!src) return '';
    if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return src;
    if (window.AuraApi && window.AuraApi.API_BASE && src.startsWith('/')) {
      return `${window.AuraApi.API_BASE}${src}`;
    }
    if (src.startsWith('/')) return src;
    return src;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message, kind) {
    let host = document.getElementById('auraToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'auraToastHost';
      host.className = 'aura-toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `aura-toast aura-toast-${kind || 'info'}`;
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 320);
    }, 3200);
  }

  function adminFetch(path, options) {
    const token = getEffectiveAdminToken();
    return window.AuraApi.apiFetch(path, Object.assign({}, options || {}, { authToken: token }));
  }

  function closeAdminModal() {
    const modal = document.getElementById('auraAdminPanel');
    if (modal) modal.classList.remove('open');
    document.body.classList.remove('aura-admin-open');
    if (window.location.hash === '#admin') {
      try { history.back(); } catch (e) {}
    }
  }

  function ensureAdminPanel() {
    let panel = document.getElementById('auraAdminPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'auraAdminPanel';
    panel.className = 'aura-admin-panel';
    panel.innerHTML = `
      <div class="aap-shell">
        <aside class="aap-sidebar">
          <div class="aap-brand">
            <div class="aap-brand-mark"><i class="fas fa-gem"></i></div>
            <div>
              <p class="aap-brand-title">Aura Studio</p>
              <p class="aap-brand-sub">Catalog Manager</p>
            </div>
          </div>
          <nav class="aap-nav" id="aapNav">
            <button class="aap-nav-item active" data-view="products"><i class="fas fa-box-open"></i><span>Products</span></button>
            <button class="aap-nav-item" data-view="collections"><i class="fas fa-layer-group"></i><span>Collections</span></button>
            <button class="aap-nav-item" data-view="homepage"><i class="fas fa-house"></i><span>Homepage</span></button>
            <button class="aap-nav-item" data-view="orders"><i class="fas fa-receipt"></i><span>Orders</span></button>
            <button class="aap-nav-item" data-view="preview"><i class="fas fa-eye"></i><span>Home Preview</span></button>
            <button class="aap-nav-item" data-view="tools"><i class="fas fa-flask"></i><span>Testing &amp; Setup</span></button>
            <button class="aap-nav-item" data-view="history"><i class="fas fa-clock-rotate-left"></i><span>History</span></button>
            <button class="aap-nav-item" data-view="help"><i class="fas fa-question-circle"></i><span>Quick Help</span></button>
          </nav>
          <div class="aap-side-footer">
            <button class="aap-side-btn" id="aapRefresh"><i class="fas fa-sync-alt"></i> Reload</button>
            <button class="aap-side-btn aap-logout" id="aapLogout"><i class="fas fa-sign-out-alt"></i> Logout</button>
          </div>
        </aside>
        <main class="aap-main">
          <header class="aap-topbar">
            <div>
              <h2 id="aapTitle">Products</h2>
              <p class="aap-sub" id="aapSubtitle">Manage your store catalog · add, edit or remove products.</p>
            </div>
            <div class="aap-top-actions">
              <button class="aap-btn-publish" id="aapPublish" title="Save and push changes to live site"><i class="fas fa-rocket"></i> Apply &amp; Publish</button>
              <button class="aap-icon-btn" id="aapClose" aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
          </header>
          <section class="aap-content" id="aapContent"></section>
        </main>
      </div>
      <div class="aap-modal-host" id="aapModalHost"></div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#aapClose').addEventListener('click', closeAdminModal);
    panel.querySelector('#aapPublish').addEventListener('click', handlePublish);
    panel.querySelector('#aapLogout').addEventListener('click', function () {
      setAdminToken(null);
      closeAdminModal();
      // Note: if the admin session came from the signed-in user's own admin
      // token, they remain logged in as that user (use the account menu to fully
      // sign out). We just end the dedicated admin session and close the panel
      // without bouncing straight back into a login prompt.
      updateAdminIcon();
    });
    panel.querySelector('#aapRefresh').addEventListener('click', reloadAll);
    panel.querySelector('#aapNav').addEventListener('click', function (e) {
      const btn = e.target.closest('.aap-nav-item');
      if (!btn) return;
      panel.querySelectorAll('.aap-nav-item').forEach((b) => b.classList.toggle('active', b === btn));
      state.view = btn.dataset.view;
      renderView();
    });

    return panel;
  }

  function ensureLoginCard() {
    let overlay = document.getElementById('auraAdminLogin');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'auraAdminLogin';
    overlay.className = 'aura-auth-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="aura-auth-card aap-login-card">
        <div class="aura-auth-header">
          <h3><i class="fas fa-user-shield" style="margin-right:10px;color:var(--rose-gold);"></i>Admin Login</h3>
          <button class="aura-auth-close" id="aapLoginClose" aria-label="Close">&times;</button>
        </div>
        <p class="aura-auth-subtitle">Sign in with the admin credentials configured on the server.</p>
        <div class="ck-field"><input type="email" id="aapLoginEmail" placeholder="Admin email" autocomplete="username"></div>
        <div class="ck-field"><input type="password" id="aapLoginPassword" placeholder="Admin password" autocomplete="current-password"></div>
        <button class="ck-pay-now-btn" id="aapLoginBtn">Login to dashboard</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#aapLoginClose').addEventListener('click', function () {
      overlay.style.display = 'none';
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });
    overlay.querySelector('#aapLoginBtn').addEventListener('click', handleAdminLogin);
    overlay.querySelectorAll('input').forEach((input) => {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleAdminLogin();
      });
    });
    return overlay;
  }

  async function handleAdminLogin() {
    const overlay = ensureLoginCard();
    const email = overlay.querySelector('#aapLoginEmail').value.trim();
    const password = overlay.querySelector('#aapLoginPassword').value;
    const btn = overlay.querySelector('#aapLoginBtn');
    if (!email || !password) {
      toast('Please enter your admin email and password.', 'error');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const res = await window.AuraApi.apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        authToken: null
      });
      const token = res.data?.token || res.token;
      if (!token) throw new Error('No admin token returned');
      setAdminToken(token);
      overlay.style.display = 'none';
      openAdminPanel();
    } catch (err) {
      toast(`Login failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login to dashboard';
    }
  }

  function openLoginModal() {
    const overlay = ensureLoginCard();
    overlay.style.display = 'flex';
    setTimeout(() => {
      const input = overlay.querySelector('#aapLoginEmail');
      if (input) input.focus();
    }, 60);
  }

  async function openAdminPanel() {
    const panel = ensureAdminPanel();
    panel.classList.add('open');
    document.body.classList.add('aura-admin-open');
    if (!getEffectiveAdminToken()) {
      openLoginModal();
      return;
    }
    await reloadAll();
  }

  async function reloadAll() {
    const content = document.getElementById('aapContent');
    if (content) content.innerHTML = renderLoadingState();
    try {
      const [productsRes, collectionsRes, siteRes] = await Promise.all([
        adminFetch('/api/admin/products'),
        adminFetch('/api/admin/collections'),
        adminFetch('/api/admin/site')
      ]);
      state.products = productsRes.data || [];
      state.collections = collectionsRes.data || [];
      state.site = siteRes.data || { hero: { slides: [] }, hampers: [] };
      if (!state.site.hero) state.site.hero = { slides: [] };
      if (!Array.isArray(state.site.hampers)) state.site.hampers = [];
      renderView();
    } catch (err) {
      if (/401|admin|token/i.test(err.message || '')) {
        setAdminToken(null);
        closeAdminModal();
        openLoginModal();
        return;
      }
      toast(`Failed to load: ${err.message}`, 'error');
      if (content) content.innerHTML = `<div class="aap-empty">Failed to load data: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderLoadingState() {
    return `<div class="aap-loading"><div class="aap-spinner"></div><p>Loading dashboard…</p></div>`;
  }

  function renderView() {
    const panel = ensureAdminPanel();
    const title = panel.querySelector('#aapTitle');
    const sub = panel.querySelector('#aapSubtitle');
    if (state.view === 'products') {
      title.textContent = 'Products';
      sub.textContent = 'Manage your store catalog · add, edit or remove products.';
      renderProductsView();
    } else if (state.view === 'collections') {
      title.textContent = 'Collections';
      sub.textContent = 'Create and manage collections (categories) for your products.';
      renderCollectionsView();
    } else if (state.view === 'homepage') {
      title.textContent = 'Homepage';
      sub.textContent = 'Manage your hero banner images and the Trending Hampers showcase.';
      renderHomepageView();
    } else if (state.view === 'tools') {
      title.textContent = 'Testing & Setup';
      sub.textContent = 'Send test orders, test email & WhatsApp alerts, and check your integrations.';
      renderToolsView();
    } else if (state.view === 'history') {
      title.textContent = 'History';
      sub.textContent = 'View past snapshots and roll back to any previous state.';
      renderHistoryView();
    } else if (state.view === 'help') {
      title.textContent = 'Quick Help';
      sub.textContent = 'Tips to manage your catalog without writing any code.';
      renderHelpView();
    } else if (state.view === 'orders') {
      title.textContent = 'Orders';
      sub.textContent = 'View and manage customer orders.';
      renderOrdersView();
    } else if (state.view === 'preview') {
      title.textContent = 'Home Preview';
      sub.textContent = 'See how your storefront looks to customers right now.';
      renderPreviewView();
    }
  }

  function getFilteredProducts() {
    let list = state.products.slice();
    if (state.activeCollection && state.activeCollection !== 'all') {
      list = list.filter((p) => p.collection === state.activeCollection);
    }
    const q = (state.search || '').toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).join(',').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderProductsView() {
    const content = document.getElementById('aapContent');
    const collections = state.collections.slice();
    const collectionOptions = ['<option value="all">All collections</option>']
      .concat(collections.map((c) => `<option value="${escapeHtml(c.slug)}"${state.activeCollection === c.slug ? ' selected' : ''}>${escapeHtml(c.name)}</option>`))
      .join('');
    const products = getFilteredProducts();

    const stat = `
      <div class="aap-stats">
        <div class="aap-stat"><span class="aap-stat-num">${state.products.length}</span><span>Total products</span></div>
        <div class="aap-stat"><span class="aap-stat-num">${state.collections.length}</span><span>Collections</span></div>
        <div class="aap-stat"><span class="aap-stat-num">${products.length}</span><span>Visible</span></div>
      </div>`;

    const toolbar = `
      <div class="aap-toolbar">
        <div class="aap-toolbar-row">
          <div class="aap-search">
            <i class="fas fa-search"></i>
            <input type="text" id="aapSearch" placeholder="Search products by name, description, tag…" value="${escapeHtml(state.search)}">
          </div>
          <select id="aapCollectionFilter" class="aap-select">${collectionOptions}</select>
          <button class="aap-btn-primary" id="aapNewProduct"><i class="fas fa-plus"></i> New Product</button>
        </div>
      </div>`;

    let body = '';
    if (!products.length) {
      body = `<div class="aap-empty">
        <i class="far fa-folder-open"></i>
        <h3>No products match your filters</h3>
        <p>Try a different collection or clear the search box.</p>
        <button class="aap-btn-primary" id="aapEmptyAdd"><i class="fas fa-plus"></i> Add a new product</button>
      </div>`;
    } else if (state.activeCollection !== 'all') {
      // Single collection — flat grid with drag reorder
      body = `<p class="aap-hint"><i class="fas fa-grip-vertical"></i> Drag any card to reorder products in <strong>${escapeHtml(state.collections.find(c => c.slug === state.activeCollection)?.name || state.activeCollection)}</strong>.</p>
        <div class="aap-grid" id="aapProductGrid">
          ${products.map(productCard).join('')}
        </div>`;
    } else {
      // All collections — accordion view
      const grouped = {};
      products.forEach((p) => {
        const key = p.collection || '_uncategorized';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });
      const sections = collections
        .filter((c) => grouped[c.slug] && grouped[c.slug].length)
        .map((c) => {
          const items = grouped[c.slug] || [];
          const expanded = state._expandedSections && state._expandedSections[c.slug];
          return `
            <div class="aap-accordion" data-section="${escapeHtml(c.slug)}">
              <div class="aap-accordion-header${expanded ? ' expanded' : ''}">
                <div class="aap-accordion-left">
                  <i class="fas fa-chevron-right aap-accordion-arrow"></i>
                  <h3>${escapeHtml(c.name)}</h3>
                  <span class="aap-accordion-count">${items.length} product${items.length !== 1 ? 's' : ''}</span>
                </div>
                <button class="aap-btn-secondary aap-accordion-filter" data-filter-slug="${escapeHtml(c.slug)}"><i class="fas fa-eye"></i> Manage</button>
              </div>
              <div class="aap-accordion-body${expanded ? ' expanded' : ''}">
                <div class="aap-grid">${items.map(productCard).join('')}</div>
              </div>
            </div>`;
        }).join('');
      // Check for uncategorized products
      const uncategorized = grouped['_uncategorized'] || [];
      const uncatSection = uncategorized.length ? `
        <div class="aap-accordion" data-section="_uncategorized">
          <div class="aap-accordion-header">
            <div class="aap-accordion-left">
              <i class="fas fa-chevron-right aap-accordion-arrow"></i>
              <h3>Uncategorized</h3>
              <span class="aap-accordion-count">${uncategorized.length} product${uncategorized.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="aap-accordion-body">
            <div class="aap-grid">${uncategorized.map(productCard).join('')}</div>
          </div>
        </div>` : '';
      body = sections + uncatSection;
      if (!body) body = `<div class="aap-empty"><i class="far fa-folder-open"></i><h3>No products yet</h3></div>`;
    }

    content.innerHTML = stat + toolbar + body;

    content.querySelector('#aapSearch').addEventListener('input', function (e) {
      state.search = e.target.value;
      renderProductsView();
    });
    content.querySelector('#aapCollectionFilter').addEventListener('change', function (e) {
      state.activeCollection = e.target.value;
      renderView();
    });
    content.querySelector('#aapNewProduct').addEventListener('click', function () {
      openProductForm(null);
    });
    const emptyAdd = content.querySelector('#aapEmptyAdd');
    if (emptyAdd) emptyAdd.addEventListener('click', function () { openProductForm(null); });

    // Accordion expand/collapse
    if (!state._expandedSections) state._expandedSections = {};
    content.querySelectorAll('.aap-accordion-header').forEach((header) => {
      header.addEventListener('click', function (e) {
        if (e.target.closest('.aap-accordion-filter')) return;
        const section = this.closest('.aap-accordion');
        const slug = section.dataset.section;
        const body = section.querySelector('.aap-accordion-body');
        const isExpanded = this.classList.contains('expanded');
        this.classList.toggle('expanded', !isExpanded);
        body.classList.toggle('expanded', !isExpanded);
        state._expandedSections[slug] = !isExpanded;
      });
    });
    content.querySelectorAll('.aap-accordion-filter').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        state.activeCollection = this.dataset.filterSlug;
        renderView();
      });
    });

    bindProductCardEvents(content);
    if (state.activeCollection !== 'all') {
      enableDragReorder(content.querySelector('#aapProductGrid'));
    }
  }

  function productCard(p) {
    const collectionName = state.collections.find((c) => c.slug === p.collection)?.name || p.collection || '—';
    const tags = (p.tags || []).slice(0, 3).map((t) => `<span class="aap-tag">${escapeHtml(t)}</span>`).join('');
    return `
      <article class="aap-card" data-id="${escapeHtml(p.id)}" draggable="false">
        <div class="aap-card-media">
          <img src="${escapeHtml(resolveImage(p.image))}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.opacity=0.3;this.src='data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23f1e6df%22/%3E%3Ctext x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23b76e79%22 font-size=%2210%22%3ENo image%3C/text%3E%3C/svg%3E'">
          <div class="aap-card-overlay">
            <button class="aap-overlay-btn" data-action="edit" data-id="${escapeHtml(p.id)}"><i class="fas fa-pen"></i> Edit</button>
            <button class="aap-overlay-btn danger" data-action="delete" data-id="${escapeHtml(p.id)}"><i class="fas fa-trash"></i> Delete</button>
          </div>
          <div class="aap-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>
        </div>
        <div class="aap-card-body">
          <p class="aap-card-collection">${escapeHtml(collectionName)}</p>
          <h4 class="aap-card-title">${escapeHtml(p.name)}</h4>
          <div class="aap-card-row">
            <span class="aap-card-price">₹${Number(p.price || 0).toLocaleString('en-IN')}</span>
            <div class="aap-card-tags">${tags}</div>
          </div>
        </div>
      </article>`;
  }

  function bindProductCardEvents(root) {
    root.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = this.dataset.id;
        const action = this.dataset.action;
        const product = state.products.find((p) => p.id === id);
        if (!product) return;
        if (action === 'edit') openProductForm(product);
        if (action === 'delete') confirmDeleteProduct(product);
      });
    });
  }

  function enableDragReorder(grid) {
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.aap-card'));
    cards.forEach((card) => {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', function (e) {
        card.classList.add('dragging');
        grid.classList.add('drag-active');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.id); } catch (err) {}
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        grid.classList.remove('drag-active');
        grid.querySelectorAll('.aap-card.drag-over').forEach((c) => c.classList.remove('drag-over'));
        commitReorder(grid);
      });
      card.addEventListener('dragenter', function () {
        if (!card.classList.contains('dragging')) card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', function () {
        card.classList.remove('drag-over');
      });

      // Touch drag support for mobile
      const handle = card.querySelector('.aap-drag-handle') || card;
      let touchStartY = 0;
      let touchStartX = 0;
      handle.addEventListener('touchstart', function (e) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        card.classList.add('dragging');
        grid.classList.add('drag-active');
        card.style.zIndex = '1000';
      }, { passive: true });
      handle.addEventListener('touchmove', function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        // Clear old drag-over highlights
        grid.querySelectorAll('.aap-card.drag-over').forEach((c) => c.classList.remove('drag-over'));
        const after = getDragAfterElement(grid, touch.clientX, touch.clientY);
        if (after) after.classList.add('drag-over');
        if (after == null) grid.appendChild(card);
        else grid.insertBefore(card, after);
      }, { passive: false });
      handle.addEventListener('touchend', function () {
        card.classList.remove('dragging');
        grid.classList.remove('drag-active');
        card.style.zIndex = '';
        grid.querySelectorAll('.aap-card.drag-over').forEach((c) => c.classList.remove('drag-over'));
        commitReorder(grid);
      });
    });
    grid.addEventListener('dragover', function (e) {
      e.preventDefault();
      const dragging = grid.querySelector('.aap-card.dragging');
      if (!dragging) return;
      const after = getDragAfterElement(grid, e.clientX, e.clientY);
      // Highlight the card we're hovering over
      grid.querySelectorAll('.aap-card.drag-over').forEach((c) => c.classList.remove('drag-over'));
      if (after) after.classList.add('drag-over');
      if (after == null) {
        grid.appendChild(dragging);
      } else {
        grid.insertBefore(dragging, after);
      }
    });
  }

  function getDragAfterElement(container, x, y) {
    const draggables = [...container.querySelectorAll('.aap-card:not(.dragging), .aap-hp-card:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    draggables.forEach((child) => {
      const box = child.getBoundingClientRect();
      const offsetY = y - box.top - box.height / 2;
      const offsetX = x - box.left - box.width / 2;
      const offset = offsetY < 0 ? offsetY : offsetX < 0 ? offsetX : Number.NEGATIVE_INFINITY;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: child };
      }
    });
    return closest.element;
  }

  async function commitReorder(grid) {
    if (state.activeCollection === 'all') return;
    const order = Array.from(grid.querySelectorAll('.aap-card')).map((c) => c.dataset.id);
    try {
      await adminFetch('/api/admin/products/reorder', {
        method: 'POST',
        body: JSON.stringify({ collection: state.activeCollection, order })
      });
      const inCollection = state.products.filter((p) => p.collection === state.activeCollection);
      const others = state.products.filter((p) => p.collection !== state.activeCollection);
      const reordered = order
        .map((id) => inCollection.find((p) => p.id === id))
        .filter(Boolean);
      const tail = inCollection.filter((p) => !order.includes(p.id));
      state.products = [...others, ...reordered, ...tail];
      toast('Order saved', 'success');
    } catch (err) {
      toast(`Reorder failed: ${err.message}`, 'error');
      renderView();
    }
  }

  function confirmDeleteProduct(product) {
    openModal({
      title: 'Delete product?',
      html: `<p style="margin-bottom:14px;">This will permanently remove <strong>${escapeHtml(product.name)}</strong> from your store and update the live page.</p>`,
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: 'Delete product', kind: 'danger', onClick: async function (btn) {
            btn.disabled = true; btn.textContent = 'Deleting…';
            try {
              await adminFetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
              state.products = state.products.filter((p) => p.id !== product.id);
              closeModal();
              toast('Product deleted', 'success');
              renderView();
            } catch (err) {
              toast(`Delete failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete product';
            }
          }
        }
      ]
    });
  }

  function openProductForm(product) {
    const isEdit = Boolean(product);
    const collections = state.collections.slice();
    const collectionSlug = product?.collection || (collections[0]?.slug || '');
    const formHtml = `
      <form id="aapProductForm" class="aap-form">
        <div class="aap-form-grid">
          <div class="aap-form-image">
            <label class="aap-label">Product image</label>
            <div class="aap-uploader" id="aapUploader">
              <div class="aap-uploader-preview" id="aapPreview">
                ${product?.image ? `<img src="${escapeHtml(resolveImage(product.image))}" alt="">` : `<div class="aap-uploader-placeholder"><i class="fas fa-image"></i><p>Drag &amp; drop or click to upload</p><span>JPG, PNG, WEBP up to 8&nbsp;MB</span></div>`}
              </div>
              <input type="file" id="aapImageFile" accept="image/*" hidden>
              <div class="aap-uploader-actions">
                <button type="button" class="aap-btn-secondary" id="aapPickImage"><i class="fas fa-upload"></i> Choose file</button>
                <input type="text" id="aapImageUrl" class="aap-input" placeholder="or paste image URL/path" value="${escapeHtml(product?.image || '')}">
              </div>
              <p class="aap-uploader-hint" id="aapUploadStatus"></p>
            </div>
          </div>
          <div class="aap-form-fields">
            <label class="aap-label">Product name</label>
            <input class="aap-input" id="aapName" type="text" placeholder="e.g. Pearl Hair Claw" value="${escapeHtml(product?.name || '')}" required>

            <div class="aap-form-row">
              <div>
                <label class="aap-label">Collection</label>
                <select class="aap-input" id="aapCollection" required>
                  ${collections.map((c) => `<option value="${escapeHtml(c.slug)}"${c.slug === collectionSlug ? ' selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="aap-label">Price (₹)</label>
                <input class="aap-input" id="aapPrice" type="number" min="0" step="1" placeholder="499" value="${escapeHtml(product?.price ?? '')}" required>
              </div>
            </div>

            <label class="aap-label">Short description</label>
            <textarea class="aap-input" id="aapDescription" rows="3" placeholder="A few words about this product">${escapeHtml(product?.description || '')}</textarea>

            <label class="aap-label">Tags <span class="aap-label-sub">(comma separated)</span></label>
            <input class="aap-input" id="aapTags" type="text" placeholder="bracelet, pastel, gift" value="${escapeHtml((product?.tags || []).join(', '))}">

            <label class="aap-label">URL slug <span class="aap-label-sub">(auto from name if blank)</span></label>
            <input class="aap-input" id="aapSlug" type="text" placeholder="pearl-hair-claw" value="${escapeHtml(product?.slug || '')}">
          </div>
        </div>
      </form>`;

    openModal({
      title: isEdit ? 'Edit product' : 'Add a new product',
      html: formHtml,
      wide: true,
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: isEdit ? 'Save changes' : 'Create product',
          kind: 'primary',
          onClick: async function (btn) {
            await submitProductForm(product, btn);
          }
        }
      ]
    });

    setTimeout(bindUploader, 0);
  }

  function bindUploader() {
    const fileInput = document.getElementById('aapImageFile');
    const pickBtn = document.getElementById('aapPickImage');
    const dropZone = document.getElementById('aapUploader');
    const preview = document.getElementById('aapPreview');
    const urlInput = document.getElementById('aapImageUrl');
    const status = document.getElementById('aapUploadStatus');
    if (!fileInput || !pickBtn) return;

    function refreshPreview(src) {
      if (!preview) return;
      preview.innerHTML = src
        ? `<img src="${escapeHtml(resolveImage(src))}" alt="">`
        : `<div class="aap-uploader-placeholder"><i class="fas fa-image"></i><p>Drag &amp; drop or click to upload</p><span>JPG, PNG, WEBP up to 8&nbsp;MB</span></div>`;
    }

    pickBtn.addEventListener('click', function () { fileInput.click(); });
    preview.addEventListener('click', function () { fileInput.click(); });

    async function uploadFile(file) {
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) {
        toast('Please choose a valid image file.', 'error');
        return;
      }
      status.textContent = 'Uploading…';
      const form = new FormData();
      form.append('image', file);
      try {
        const res = await fetch(`${window.AuraApi.API_BASE}/api/admin/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getEffectiveAdminToken()}` },
          body: form
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
        const url = data.data?.absoluteUrl || data.data?.url || data.url;
        urlInput.value = url;
        refreshPreview(url);
        status.innerHTML = `<i class="fas fa-check-circle" style="color:#3ba35a;"></i> Uploaded`;
        toast('Image uploaded', 'success');
      } catch (err) {
        status.innerHTML = `<i class="fas fa-times-circle" style="color:#c1432d;"></i> ${escapeHtml(err.message)}`;
        toast(`Upload failed: ${err.message}`, 'error');
      }
    }

    fileInput.addEventListener('change', function () {
      const file = this.files && this.files[0];
      if (file) uploadFile(file);
    });

    ;['dragenter', 'dragover'].forEach((evt) => {
      dropZone.addEventListener(evt, function (e) {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.add('drop-active');
      });
    });
    ;['dragleave', 'drop'].forEach((evt) => {
      dropZone.addEventListener(evt, function (e) {
        e.preventDefault(); e.stopPropagation();
        dropZone.classList.remove('drop-active');
      });
    });
    dropZone.addEventListener('drop', function (e) {
      const file = e.dataTransfer?.files?.[0];
      if (file) uploadFile(file);
    });

    urlInput.addEventListener('input', function () {
      refreshPreview(this.value);
    });
  }

  async function submitProductForm(existing, btn) {
    const name = document.getElementById('aapName').value.trim();
    const collection = document.getElementById('aapCollection').value;
    const price = Number(document.getElementById('aapPrice').value);
    const image = document.getElementById('aapImageUrl').value.trim();
    const description = document.getElementById('aapDescription').value.trim();
    const tags = document.getElementById('aapTags').value;
    const slug = document.getElementById('aapSlug').value.trim();
    if (!name) return toast('Please add a product name.', 'error');
    if (!collection) return toast('Please pick a collection.', 'error');
    if (!Number.isFinite(price) || price < 0) return toast('Enter a valid price.', 'error');
    if (!image) return toast('Please add a product image.', 'error');
    const payload = { name, collection, price, image, description, tags, slug };
    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = existing ? 'Saving…' : 'Creating…';
    try {
      let res;
      if (existing) {
        res = await adminFetch(`/api/admin/products/${encodeURIComponent(existing.id)}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        const updated = res.data;
        const idx = state.products.findIndex((p) => p.id === existing.id);
        if (idx !== -1 && updated) state.products[idx] = updated;
        toast('Product updated', 'success');
      } else {
        res = await adminFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.data) state.products.push(res.data);
        toast('Product added', 'success');
      }
      closeModal();
      renderView();
    } catch (err) {
      toast(`Save failed: ${err.message}`, 'error');
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  function renderCollectionsView() {
    const content = document.getElementById('aapContent');
    const counts = state.products.reduce((acc, p) => {
      acc[p.collection] = (acc[p.collection] || 0) + 1;
      return acc;
    }, {});
    const cards = state.collections.map((c) => `
      <article class="aap-coll-card">
        <div class="aap-coll-head">
          <div>
            <h4>${escapeHtml(c.name)}</h4>
            <p class="aap-coll-slug">/${escapeHtml(c.slug)}</p>
          </div>
          <span class="aap-coll-count">${counts[c.slug] || 0} items</span>
        </div>
        <p class="aap-coll-desc">${escapeHtml(c.description || 'No description added.')}</p>
        <div class="aap-coll-actions">
          <button class="aap-btn-secondary" data-coll-edit="${escapeHtml(c.slug)}"><i class="fas fa-pen"></i> Edit</button>
          <button class="aap-btn-secondary" data-coll-view="${escapeHtml(c.slug)}"><i class="fas fa-eye"></i> View products</button>
          <button class="aap-btn-ghost danger" data-coll-delete="${escapeHtml(c.slug)}"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </article>`).join('');

    content.innerHTML = `
      <div class="aap-toolbar">
        <div class="aap-toolbar-row">
          <p class="aap-hint" style="margin:0;flex:1;"><i class="fas fa-info-circle"></i> Collections organise your products into categories like Bracelets, Earrings, etc.</p>
          <button class="aap-btn-primary" id="aapNewCollection"><i class="fas fa-plus"></i> New Collection</button>
        </div>
      </div>
      <div class="aap-coll-grid">${cards || '<div class="aap-empty"><i class="far fa-folder"></i><h3>No collections yet</h3><p>Create your first collection to start organising products.</p></div>'}</div>`;

    content.querySelector('#aapNewCollection').addEventListener('click', function () { openCollectionForm(null); });
    content.querySelectorAll('[data-coll-edit]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const slug = this.dataset.collEdit;
        const coll = state.collections.find((c) => c.slug === slug);
        if (coll) openCollectionForm(coll);
      });
    });
    content.querySelectorAll('[data-coll-view]').forEach((btn) => {
      btn.addEventListener('click', function () {
        state.activeCollection = this.dataset.collView;
        state.view = 'products';
        document.querySelectorAll('.aap-nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === 'products'));
        renderView();
      });
    });
    content.querySelectorAll('[data-coll-delete]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const slug = this.dataset.collDelete;
        const coll = state.collections.find((c) => c.slug === slug);
        if (coll) confirmDeleteCollection(coll, counts[slug] || 0);
      });
    });
  }

  function openCollectionForm(coll) {
    const isEdit = Boolean(coll);
    const html = `
      <form class="aap-form">
        <label class="aap-label">Cover image</label>
        <div class="aap-uploader" id="aapUploader">
          <div class="aap-uploader-preview" id="aapPreview">
            ${coll?.image ? `<img src="${escapeHtml(resolveImage(coll.image))}" alt="">` : `<div class="aap-uploader-placeholder"><i class="fas fa-image"></i><p>Drag &amp; drop or click to upload</p><span>JPG, PNG, WEBP up to 8&nbsp;MB</span></div>`}
          </div>
          <input type="file" id="aapImageFile" accept="image/*" hidden>
          <div class="aap-uploader-actions">
            <button type="button" class="aap-btn-secondary" id="aapPickImage"><i class="fas fa-upload"></i> Choose file</button>
            <input type="text" id="aapImageUrl" class="aap-input" placeholder="or paste image URL/path" value="${escapeHtml(coll?.image || '')}">
          </div>
          <p class="aap-uploader-hint" id="aapUploadStatus"></p>
        </div>
        <label class="aap-label">Display name</label>
        <input class="aap-input" id="aapCollName" type="text" placeholder="e.g. Hair Bows" value="${escapeHtml(coll?.name || '')}" required>
        <label class="aap-label">URL slug ${isEdit ? '<span class="aap-label-sub">(cannot be changed)</span>' : '<span class="aap-label-sub">(auto from name)</span>'}</label>
        <input class="aap-input" id="aapCollSlug" type="text" placeholder="hair-bows" value="${escapeHtml(coll?.slug || '')}"${isEdit ? ' disabled' : ''}>
        <label class="aap-label">Description</label>
        <textarea class="aap-input" id="aapCollDesc" rows="3" placeholder="Short tagline for this collection">${escapeHtml(coll?.description || '')}</textarea>
      </form>`;
    openModal({
      title: isEdit ? 'Edit collection' : 'Create new collection',
      html,
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: isEdit ? 'Save' : 'Create collection',
          kind: 'primary',
          onClick: async function (btn) {
            const name = document.getElementById('aapCollName').value.trim();
            const slug = document.getElementById('aapCollSlug').value.trim();
            const description = document.getElementById('aapCollDesc').value.trim();
            const image = document.getElementById('aapImageUrl').value.trim();
            if (!name) return toast('Please enter a name.', 'error');
            btn.disabled = true; btn.textContent = isEdit ? 'Saving…' : 'Creating…';
            try {
              if (isEdit) {
                const res = await adminFetch(`/api/admin/collections/${encodeURIComponent(coll.slug)}`, {
                  method: 'PUT',
                  body: JSON.stringify({ name, description, image })
                });
                const updated = res.data;
                const idx = state.collections.findIndex((c) => c.slug === coll.slug);
                if (idx !== -1 && updated) state.collections[idx] = updated;
                toast('Collection updated', 'success');
              } else {
                const res = await adminFetch('/api/admin/collections', {
                  method: 'POST',
                  body: JSON.stringify({ name, slug, description, image })
                });
                if (res.data) state.collections.push(res.data);
                toast('Collection created', 'success');
              }
              closeModal();
              renderView();
            } catch (err) {
              toast(`Failed: ${err.message}`, 'error');
              btn.disabled = false;
              btn.textContent = isEdit ? 'Save' : 'Create collection';
            }
          }
        }
      ]
    });
    setTimeout(bindUploader, 0);
  }

  function confirmDeleteCollection(coll, productCount) {
    const productsInColl = state.products.filter((p) => p.collection === coll.slug);
    const productListHtml = productsInColl.length
      ? `<div class="aap-delete-products-list" style="max-height:200px;overflow-y:auto;margin:10px 0;">
           ${productsInColl.map((p) => `
             <label class="aap-delete-product-item" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:background 0.15s;">
               <input type="checkbox" class="aap-del-check" value="${escapeHtml(p.id)}" checked>
               <img src="${escapeHtml(resolveImage(p.image))}" alt="" style="width:36px;height:36px;border-radius:6px;object-fit:cover;">
               <div style="flex:1;min-width:0;">
                 <span style="font-weight:500;font-size:0.85rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.name)}</span>
                 <span style="font-size:0.75rem;color:#888;">₹${Number(p.price).toLocaleString('en-IN')}</span>
               </div>
             </label>`).join('')}
         </div>` : '';

    const warn = productCount > 0
      ? `<div style="background:#fff3e0;border:1px solid #f9a825;border-radius:8px;padding:14px;margin-bottom:14px;">
           <p style="color:#e65100;font-weight:600;margin-bottom:6px;"><i class="fas fa-exclamation-triangle"></i> This section contains <strong>${productCount}</strong> product${productCount === 1 ? '' : 's'}</p>
           <p style="color:#6d4c00;font-size:0.85rem;">Select which products to delete, or choose an action below.</p>
         </div>${productListHtml}`
      : `<p style="margin-bottom:14px;">This section has no products. Safe to delete.</p>`;

    openModal({
      title: `Manage "${coll.name}" section`,
      html: warn,
      wide: productCount > 0,
      actions: productCount > 0 ? [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: 'Clear section (keep section, delete products)', kind: 'secondary', onClick: async function (btn) {
            btn.disabled = true; btn.textContent = 'Clearing…';
            try {
              // Delete all products in this collection one by one
              for (const p of productsInColl) {
                await adminFetch(`/api/admin/products/${encodeURIComponent(p.id)}`, { method: 'DELETE' });
              }
              state.products = state.products.filter((p) => p.collection !== coll.slug);
              toast(`Cleared ${productsInColl.length} products from ${coll.name}`, 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Clear section (keep section, delete products)';
            }
          }
        },
        {
          label: 'Delete selected products', kind: 'primary', onClick: async function (btn) {
            const checked = Array.from(document.querySelectorAll('.aap-del-check:checked')).map((cb) => cb.value);
            if (!checked.length) return toast('Select at least one product.', 'error');
            btn.disabled = true; btn.textContent = `Deleting ${checked.length}…`;
            try {
              for (const id of checked) {
                await adminFetch(`/api/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
              }
              state.products = state.products.filter((p) => !checked.includes(p.id));
              toast(`Deleted ${checked.length} product${checked.length !== 1 ? 's' : ''}`, 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete selected products';
            }
          }
        },
        {
          label: 'Delete entire section', kind: 'danger', onClick: async function (btn) {
            btn.disabled = true; btn.textContent = 'Deleting…';
            try {
              await adminFetch(`/api/admin/collections/${encodeURIComponent(coll.slug)}?force=1`, { method: 'DELETE' });
              state.collections = state.collections.filter((c) => c.slug !== coll.slug);
              state.products = state.products.filter((p) => p.collection !== coll.slug);
              toast('Section and all products deleted', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Delete failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete entire section';
            }
          }
        }
      ] : [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: 'Delete section', kind: 'danger', onClick: async function (btn) {
            btn.disabled = true; btn.textContent = 'Deleting…';
            try {
              await adminFetch(`/api/admin/collections/${encodeURIComponent(coll.slug)}`, { method: 'DELETE' });
              state.collections = state.collections.filter((c) => c.slug !== coll.slug);
              toast('Section deleted', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Delete failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete section';
            }
          }
        }
      ]
    });
  }

  async function regeneratePages() {
    try {
      await adminFetch('/api/admin/regenerate-pages', { method: 'POST' });
      toast('Pages republished', 'success');
    } catch (err) {
      toast(`Republish failed: ${err.message}`, 'error');
    }
  }

  async function handlePublish() {
    const btn = document.getElementById('aapPublish');
    if (!btn) return;
    btn.disabled = true;
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing…';
    try {
      const res = await adminFetch('/api/admin/publish', { method: 'POST' });
      if (res.data?.pushed) {
        toast('Changes published to live site!', 'success');
      } else {
        toast(res.data?.message || 'No changes to publish', 'info');
      }
    } catch (err) {
      toast(`Publish failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }

  async function renderHistoryView() {
    const content = document.getElementById('aapContent');
    content.innerHTML = renderLoadingState();
    try {
      const res = await adminFetch('/api/admin/snapshots');
      const snapshots = res.data || [];
      if (!snapshots.length) {
        content.innerHTML = `
          <div class="aap-toolbar">
            <div class="aap-toolbar-row">
              <p class="aap-hint" style="margin:0;flex:1;"><i class="fas fa-info-circle"></i> Snapshots are created automatically before destructive operations (deletes) and before publishing.</p>
              <button class="aap-btn-primary" id="aapCreateSnapshot"><i class="fas fa-camera"></i> Create Snapshot Now</button>
            </div>
          </div>
          <div class="aap-empty">
            <i class="fas fa-clock-rotate-left"></i>
            <h3>No snapshots yet</h3>
            <p>Snapshots are created automatically before any delete or publish operation. You can also create one manually.</p>
          </div>`;
        content.querySelector('#aapCreateSnapshot').addEventListener('click', async function () {
          this.disabled = true; this.textContent = 'Creating…';
          try {
            await adminFetch('/api/admin/snapshot', { method: 'POST', body: JSON.stringify({ label: 'Manual snapshot' }) });
            toast('Snapshot created', 'success');
            renderHistoryView();
          } catch (err) { toast(`Failed: ${err.message}`, 'error'); }
        });
        return;
      }

      const cards = snapshots.map((s) => {
        const date = new Date(s.createdAt);
        const timeStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          + ' at ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return `
          <article class="aap-history-card">
            <div class="aap-history-info">
              <h4><i class="fas fa-camera"></i> ${escapeHtml(s.label)}</h4>
              <p class="aap-history-meta">${timeStr} · ${s.productCount || '?'} products · ${s.collectionCount || '?'} collections</p>
            </div>
            <div class="aap-history-actions">
              <button class="aap-btn-secondary" data-restore="${escapeHtml(s.id)}"><i class="fas fa-rotate-left"></i> Restore</button>
              <button class="aap-btn-ghost danger" data-snap-delete="${escapeHtml(s.id)}"><i class="fas fa-trash"></i></button>
            </div>
          </article>`;
      }).join('');

      content.innerHTML = `
        <div class="aap-toolbar">
          <div class="aap-toolbar-row">
            <p class="aap-hint" style="margin:0;flex:1;"><i class="fas fa-info-circle"></i> Restoring a snapshot will replace all products, collections, and homepage data. A backup of the current state is created first.</p>
            <button class="aap-btn-primary" id="aapCreateSnapshot"><i class="fas fa-camera"></i> Create Snapshot</button>
          </div>
        </div>
        <div class="aap-history-list">${cards}</div>`;

      content.querySelector('#aapCreateSnapshot').addEventListener('click', async function () {
        this.disabled = true; this.textContent = 'Creating…';
        try {
          await adminFetch('/api/admin/snapshot', { method: 'POST', body: JSON.stringify({ label: 'Manual snapshot' }) });
          toast('Snapshot created', 'success');
          renderHistoryView();
        } catch (err) { toast(`Failed: ${err.message}`, 'error'); }
      });

      content.querySelectorAll('[data-restore]').forEach((btn) => {
        btn.addEventListener('click', function () {
          const id = this.dataset.restore;
          openModal({
            title: 'Restore this snapshot?',
            html: '<p>This will replace all current products, collections, and homepage content with the data from this snapshot. A backup of the current state will be saved first.</p>',
            actions: [
              { label: 'Cancel', kind: 'secondary', onClick: closeModal },
              {
                label: 'Restore', kind: 'primary', onClick: async function (btn) {
                  btn.disabled = true; btn.textContent = 'Restoring…';
                  try {
                    await adminFetch(`/api/admin/restore/${encodeURIComponent(id)}`, { method: 'POST' });
                    toast('Snapshot restored! Reloading data…', 'success');
                    closeModal();
                    await reloadAll();
                  } catch (err) {
                    toast(`Restore failed: ${err.message}`, 'error');
                    btn.disabled = false; btn.textContent = 'Restore';
                  }
                }
              }
            ]
          });
        });
      });

      content.querySelectorAll('[data-snap-delete]').forEach((btn) => {
        btn.addEventListener('click', async function () {
          const id = this.dataset.snapDelete;
          try {
            await adminFetch(`/api/admin/snapshots/${encodeURIComponent(id)}`, { method: 'DELETE' });
            toast('Snapshot deleted', 'success');
            renderHistoryView();
          } catch (err) { toast(`Delete failed: ${err.message}`, 'error'); }
        });
      });
    } catch (err) {
      content.innerHTML = `<div class="aap-empty">Failed to load snapshots: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderHelpView() {
    const content = document.getElementById('aapContent');
    content.innerHTML = `
      <div class="aap-help">
        <div class="aap-help-card">
          <h3><i class="fas fa-plus-circle"></i> Adding a product</h3>
          <ol>
            <li>Click <strong>New Product</strong> on the Products page.</li>
            <li>Drop in (or click to choose) the product photo. It uploads automatically.</li>
            <li>Fill in the name, pick a collection, set the price.</li>
            <li>Click <strong>Create product</strong> — the live shop updates instantly.</li>
          </ol>
        </div>
        <div class="aap-help-card">
          <h3><i class="fas fa-pen"></i> Editing or removing</h3>
          <p>Hover any product card and use the <strong>Edit</strong> or <strong>Delete</strong> buttons. Changes are saved straight to the store.</p>
        </div>
        <div class="aap-help-card">
          <h3><i class="fas fa-grip-vertical"></i> Reordering</h3>
          <p>Filter to a single collection, then drag the cards around. The new order is saved automatically.</p>
        </div>
        <div class="aap-help-card">
          <h3><i class="fas fa-layer-group"></i> Collections</h3>
          <p>Collections appear as categories on your shop. Create, rename, or delete them from the Collections tab. Deleting a collection can also remove its products (you choose).</p>
        </div>
        <div class="aap-help-card">
          <h3><i class="fas fa-feather"></i> Editing "Our Story"</h3>
          <p>Open the <strong>Homepage</strong> tab and click <strong>Edit About</strong> to change the story text, photo and button shown in the About section.</p>
        </div>
        <div class="aap-help-card">
          <h3><i class="fas fa-flask"></i> Testing & Setup</h3>
          <p>Use the <strong>Testing &amp; Setup</strong> tab to send yourself a test email or WhatsApp, and to place a ₹1 test order to preview the full ordering experience.</p>
        </div>
        <div class="aap-help-card">
          <h3><i class="fas fa-rocket"></i> Publishing</h3>
          <p>Changes save instantly to your store. Click <strong>Apply &amp; Publish</strong> (top right) to also push them to the public GitHub Pages site.</p>
        </div>
      </div>`;
  }

  // ─── Homepage (hero + hampers) ───
  function renderHomepageView() {
    const content = document.getElementById('aapContent');
    const slides = (state.site.hero && state.site.hero.slides) || [];
    const hampers = state.site.hampers || [];
    const collections = state.collections || [];

    // Product counts per collection for badges
    const counts = state.products.reduce((acc, p) => {
      acc[p.collection] = (acc[p.collection] || 0) + 1;
      return acc;
    }, {});

    const heroCards = slides.map((s) => `
      <article class="aap-hp-card" data-id="${escapeHtml(s.id)}" draggable="true">
        <div class="aap-hp-media">
          <img src="${escapeHtml(resolveImage(s.image))}" alt="${escapeHtml(s.alt || '')}" loading="lazy">
          <div class="aap-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>
        </div>
        <div class="aap-hp-body">
          <p class="aap-hp-caption">${escapeHtml(s.alt || 'Hero image')}</p>
          <div class="aap-hp-actions">
            <button class="aap-btn-secondary" data-hero-edit="${escapeHtml(s.id)}"><i class="fas fa-pen"></i></button>
            <button class="aap-btn-ghost danger" data-hero-delete="${escapeHtml(s.id)}"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </article>`).join('');

    // Build a map: slug → first product image for fallback thumbnails
    const firstImg = {};
    state.products.forEach((p) => {
      if (!firstImg[p.collection] && p.image) firstImg[p.collection] = p.image;
    });

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

    const collCards = collections.map((c) => {
      const coverSrc = c.image || firstImg[c.slug] || COLLECTION_IMAGES[c.slug] || '';
      return `
      <article class="aap-hp-card" data-id="${escapeHtml(c.slug)}" draggable="true">
        <div class="aap-hp-media">
          ${coverSrc
            ? `<img src="${escapeHtml(resolveImage(coverSrc))}" alt="${escapeHtml(c.name)}" loading="lazy">`
            : `<div class="aap-coll-thumb" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#f8e8ec 0%,#e8d0d5 100%);color:var(--rose-gold,#b76e79);">
                <div style="text-align:center;">
                  <i class="fas fa-layer-group" style="font-size:2rem;margin-bottom:6px;"></i>
                  <p style="font-size:0.82rem;font-weight:600;margin:0;">${escapeHtml(c.name)}</p>
                </div>
              </div>`}
          <div class="aap-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>
        </div>
        <div class="aap-hp-body">
          <p class="aap-hp-caption">${escapeHtml(c.name)}</p>
          <p class="aap-hp-price">${counts[c.slug] || 0} product${(counts[c.slug] || 0) === 1 ? '' : 's'}</p>
        </div>
      </article>`;
    }).join('');

    const hamperCards = hampers.map((h) => `
      <article class="aap-hp-card" data-id="${escapeHtml(h.id)}" draggable="true">
        <div class="aap-hp-media tall">
          <img src="${escapeHtml(resolveImage(h.image))}" alt="${escapeHtml(h.title)}" loading="lazy">
          ${h.subtitle ? `<span class="aap-hp-badge">${escapeHtml(h.subtitle)}</span>` : ''}
          <div class="aap-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical"></i></div>
        </div>
        <div class="aap-hp-body">
          <p class="aap-hp-caption">${escapeHtml(h.title)}</p>
          <p class="aap-hp-price">${Number(h.price) > 0 ? '₹' + Number(h.price).toLocaleString('en-IN') : '<span class="aap-hp-price-warn">No price — set one to sell</span>'}</p>
          <div class="aap-hp-actions">
            <button class="aap-btn-secondary" data-hamper-edit="${escapeHtml(h.id)}"><i class="fas fa-pen"></i> Edit</button>
            <button class="aap-btn-ghost danger" data-hamper-delete="${escapeHtml(h.id)}"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </article>`).join('');

    const about = state.site.about || {};
    const aboutBodyPreview = escapeHtml((about.body || '').split(/\n\s*\n/)[0] || '').slice(0, 140);

    content.innerHTML = `
      <div class="aap-section-block">
        <div class="aap-block-head">
          <div>
            <h3><i class="fas fa-feather"></i> About / Our Story</h3>
            <p class="aap-hint" style="margin:4px 0 0;">The "Our Story" section on your homepage. Edit the text, image and button here.</p>
          </div>
          <button class="aap-btn-primary" id="aapEditAbout"><i class="fas fa-pen"></i> Edit About</button>
        </div>
        <div class="aap-hp-grid">
          <article class="aap-hp-card" style="cursor:default;">
            <div class="aap-hp-media">
              ${about.image ? `<img src="${escapeHtml(resolveImage(about.image))}" alt="About image" loading="lazy">` : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f1e6df;color:#b76e79;"><i class="fas fa-image" style="font-size:2rem;"></i></div>`}
            </div>
            <div class="aap-hp-body">
              <p class="aap-hp-caption">${escapeHtml(about.title || 'Our Story')}</p>
              <p class="aap-hp-price" style="color:#8a7;">${aboutBodyPreview || 'No text yet'}…</p>
            </div>
          </article>
        </div>
      </div>

      <div class="aap-section-block">
        <div class="aap-block-head">
          <div>
            <h3><i class="fas fa-images"></i> Hero Banner Slides</h3>
            <p class="aap-hint" style="margin:4px 0 0;">These rotate at the top of your homepage. Drag to reorder.</p>
          </div>
          <button class="aap-btn-primary" id="aapAddHero"><i class="fas fa-plus"></i> Add Slide</button>
        </div>
        <div class="aap-hp-grid" id="aapHeroGrid">${heroCards || '<div class="aap-empty"><i class="far fa-image"></i><h3>No hero slides</h3><p>Add at least one banner image.</p></div>'}</div>
      </div>

      <div class="aap-section-block">
        <div class="aap-block-head">
          <div>
            <h3><i class="fas fa-layer-group"></i> Collections Order</h3>
            <p class="aap-hint" style="margin:4px 0 0;">Drag to reorder how collection cards appear on the homepage. Add new collections from the Collections tab.</p>
          </div>
        </div>
        <div class="aap-hp-grid" id="aapCollGrid">${collCards || '<div class="aap-empty"><i class="far fa-folder"></i><h3>No collections yet</h3><p>Create collections from the Collections tab to see them here.</p></div>'}</div>
      </div>

      <div class="aap-section-block">
        <div class="aap-block-head">
          <div>
            <h3><i class="fas fa-gift"></i> Trending Hampers</h3>
            <p class="aap-hint" style="margin:4px 0 0;">Showcase hampers on the homepage. Drag to reorder.</p>
          </div>
          <button class="aap-btn-primary" id="aapAddHamper"><i class="fas fa-plus"></i> Add Hamper</button>
        </div>
        <div class="aap-hp-grid hampers" id="aapHamperGrid">${hamperCards || '<div class="aap-empty"><i class="far fa-image"></i><h3>No hampers yet</h3><p>Add your first hamper showcase.</p></div>'}</div>
      </div>`;

    content.querySelector('#aapEditAbout').addEventListener('click', () => openAboutForm());
    content.querySelector('#aapAddHero').addEventListener('click', () => openHeroForm(null));
    content.querySelector('#aapAddHamper').addEventListener('click', () => openHamperForm(null));

    content.querySelectorAll('[data-hero-edit]').forEach((b) => b.addEventListener('click', function () {
      const s = slides.find((x) => x.id === this.dataset.heroEdit);
      if (s) openHeroForm(s);
    }));
    content.querySelectorAll('[data-hero-delete]').forEach((b) => b.addEventListener('click', function () {
      confirmDeleteHero(this.dataset.heroDelete);
    }));
    content.querySelectorAll('[data-hamper-edit]').forEach((b) => b.addEventListener('click', function () {
      const h = hampers.find((x) => x.id === this.dataset.hamperEdit);
      if (h) openHamperForm(h);
    }));
    content.querySelectorAll('[data-hamper-delete]').forEach((b) => b.addEventListener('click', function () {
      const h = hampers.find((x) => x.id === this.dataset.hamperDelete);
      if (h) confirmDeleteHamper(h);
    }));

    enableHomepageDrag(content.querySelector('#aapHeroGrid'), 'hero');
    enableHomepageDrag(content.querySelector('#aapCollGrid'), 'collections');
    enableHomepageDrag(content.querySelector('#aapHamperGrid'), 'hampers');
  }

  function enableHomepageDrag(grid, kind) {
    if (!grid) return;
    grid.querySelectorAll('.aap-hp-card').forEach((card) => {
      card.addEventListener('dragstart', function () {
        card.classList.add('dragging');
        grid.classList.add('drag-active');
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        grid.classList.remove('drag-active');
        grid.querySelectorAll('.aap-hp-card.drag-over').forEach((c) => c.classList.remove('drag-over'));
        commitHomepageReorder(grid, kind);
      });
      card.addEventListener('dragenter', function () {
        if (!card.classList.contains('dragging')) card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', function () {
        card.classList.remove('drag-over');
      });
    });
    grid.addEventListener('dragover', function (e) {
      e.preventDefault();
      const dragging = grid.querySelector('.aap-hp-card.dragging');
      if (!dragging) return;
      grid.querySelectorAll('.aap-hp-card.drag-over').forEach((c) => c.classList.remove('drag-over'));
      const after = getDragAfterElement(grid, e.clientX, e.clientY);
      if (after) after.classList.add('drag-over');
      if (after == null) grid.appendChild(dragging);
      else grid.insertBefore(dragging, after);
    });
  }

  async function commitHomepageReorder(grid, kind) {
    const order = Array.from(grid.querySelectorAll('.aap-hp-card')).map((c) => c.dataset.id);
    let endpoint;
    if (kind === 'hero') endpoint = '/api/admin/hero/reorder';
    else if (kind === 'collections') endpoint = '/api/admin/collections/reorder';
    else endpoint = '/api/admin/hampers/reorder';
    try {
      const res = await adminFetch(endpoint, { method: 'POST', body: JSON.stringify({ order }) });
      if (kind === 'hero') state.site.hero.slides = res.data || state.site.hero.slides;
      else if (kind === 'collections') state.collections = res.data || state.collections;
      else state.site.hampers = res.data || state.site.hampers;
      toast('Order saved', 'success');
    } catch (err) {
      toast(`Reorder failed: ${err.message}`, 'error');
      renderView();
    }
  }

  function openHeroForm(slide) {
    const isEdit = Boolean(slide);
    openModal({
      title: isEdit ? 'Edit hero slide' : 'Add hero slide',
      html: imageFormHtml({
        image: slide?.image,
        captionLabel: 'Image description (alt text)',
        captionValue: slide?.alt,
        captionPlaceholder: 'e.g. Elegant gift hampers'
      }),
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: isEdit ? 'Save slide' : 'Add slide', kind: 'primary', onClick: async function (btn) {
            const image = document.getElementById('aapImageUrl').value.trim();
            const alt = document.getElementById('aapCaption').value.trim();
            if (!image) return toast('Please add an image.', 'error');
            btn.disabled = true; btn.textContent = 'Saving…';
            try {
              if (isEdit) {
                const res = await adminFetch(`/api/admin/hero/${encodeURIComponent(slide.id)}`, { method: 'PUT', body: JSON.stringify({ image, alt }) });
                const i = state.site.hero.slides.findIndex((s) => s.id === slide.id);
                if (i !== -1) state.site.hero.slides[i] = res.data;
              } else {
                const res = await adminFetch('/api/admin/hero', { method: 'POST', body: JSON.stringify({ image, alt }) });
                state.site.hero.slides.push(res.data);
              }
              toast('Hero slide saved', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Save failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = isEdit ? 'Save slide' : 'Add slide';
            }
          }
        }
      ]
    });
    setTimeout(bindUploader, 0);
  }

  function confirmDeleteHero(id) {
    openModal({
      title: 'Delete hero slide?',
      html: '<p>This banner image will be removed from your homepage slider.</p>',
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        { label: 'Delete', kind: 'danger', onClick: async function (btn) {
            btn.disabled = true; btn.textContent = 'Deleting…';
            try {
              await adminFetch(`/api/admin/hero/${encodeURIComponent(id)}`, { method: 'DELETE' });
              state.site.hero.slides = state.site.hero.slides.filter((s) => s.id !== id);
              toast('Slide deleted', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Delete failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete';
            }
          } }
      ]
    });
  }

  function openHamperForm(hamper) {
    const isEdit = Boolean(hamper);
    const extra = `
      <div class="aap-form-row">
        <div>
          <label class="aap-label">Badge / tag <span class="aap-label-sub">(optional)</span></label>
          <input class="aap-input" id="aapHamperSubtitle" type="text" placeholder="Customised" value="${escapeHtml(hamper?.subtitle || 'Customised')}">
        </div>
        <div>
          <label class="aap-label">Price (₹)</label>
          <input class="aap-input" id="aapHamperPrice" type="number" min="0" step="1" placeholder="1999" value="${escapeHtml(hamper?.price ?? '')}">
        </div>
      </div>`;
    openModal({
      title: isEdit ? 'Edit hamper' : 'Add a hamper',
      html: imageFormHtml({
        image: hamper?.image,
        captionLabel: 'Hamper title',
        captionValue: hamper?.title,
        captionPlaceholder: "e.g. Customised Birthday Hamper",
        extra
      }),
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: isEdit ? 'Save hamper' : 'Add hamper', kind: 'primary', onClick: async function (btn) {
            const image = document.getElementById('aapImageUrl').value.trim();
            const title = document.getElementById('aapCaption').value.trim();
            const subtitle = document.getElementById('aapHamperSubtitle').value.trim();
            const price = Number(document.getElementById('aapHamperPrice').value) || 0;
            if (!title) return toast('Please add a hamper title.', 'error');
            if (!image) return toast('Please add a hamper image.', 'error');
            btn.disabled = true; btn.textContent = 'Saving…';
            try {
              if (isEdit) {
                const res = await adminFetch(`/api/admin/hampers/${encodeURIComponent(hamper.id)}`, { method: 'PUT', body: JSON.stringify({ title, subtitle, image, price }) });
                const i = state.site.hampers.findIndex((h) => h.id === hamper.id);
                if (i !== -1) state.site.hampers[i] = res.data;
              } else {
                const res = await adminFetch('/api/admin/hampers', { method: 'POST', body: JSON.stringify({ title, subtitle, image, price }) });
                state.site.hampers.push(res.data);
              }
              toast('Hamper saved', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Save failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = isEdit ? 'Save hamper' : 'Add hamper';
            }
          }
        }
      ]
    });
    setTimeout(bindUploader, 0);
  }

  function confirmDeleteHamper(hamper) {
    openModal({
      title: 'Delete hamper?',
      html: `<p>Remove <strong>${escapeHtml(hamper.title)}</strong> from the homepage showcase?</p>`,
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        { label: 'Delete hamper', kind: 'danger', onClick: async function (btn) {
            btn.disabled = true; btn.textContent = 'Deleting…';
            try {
              await adminFetch(`/api/admin/hampers/${encodeURIComponent(hamper.id)}`, { method: 'DELETE' });
              state.site.hampers = state.site.hampers.filter((h) => h.id !== hamper.id);
              toast('Hamper deleted', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Delete failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete hamper';
            }
          } }
      ]
    });
  }

  function openAboutForm() {
    const about = state.site.about || {};
    const html = `
      <form class="aap-form">
        <div class="aap-form-grid">
          <div class="aap-form-image">
            <label class="aap-label">About image</label>
            <div class="aap-uploader" id="aapUploader">
              <div class="aap-uploader-preview" id="aapPreview">
                ${about.image ? `<img src="${escapeHtml(resolveImage(about.image))}" alt="">` : `<div class="aap-uploader-placeholder"><i class="fas fa-image"></i><p>Drag &amp; drop or click to upload</p><span>JPG, PNG, WEBP up to 8&nbsp;MB</span></div>`}
              </div>
              <input type="file" id="aapImageFile" accept="image/*" hidden>
              <div class="aap-uploader-actions">
                <button type="button" class="aap-btn-secondary" id="aapPickImage"><i class="fas fa-upload"></i> Choose file</button>
                <input type="text" id="aapImageUrl" class="aap-input" placeholder="or paste image URL/path" value="${escapeHtml(about.image || '')}">
              </div>
              <p class="aap-uploader-hint" id="aapUploadStatus"></p>
            </div>
          </div>
          <div class="aap-form-fields">
            <label class="aap-label">Small label <span class="aap-label-sub">(above the title)</span></label>
            <input class="aap-input" id="aapAboutLabel" type="text" placeholder="Our Story" value="${escapeHtml(about.label || '')}">

            <label class="aap-label">Heading</label>
            <input class="aap-input" id="aapAboutTitle" type="text" placeholder="Crafted with Love, Delivered with Care" value="${escapeHtml(about.title || '')}">

            <label class="aap-label">Body text <span class="aap-label-sub">(leave a blank line between paragraphs)</span></label>
            <textarea class="aap-input" id="aapAboutBody" rows="8" placeholder="Tell your story…">${escapeHtml(about.body || '')}</textarea>

            <div class="aap-form-row">
              <div>
                <label class="aap-label">Button text</label>
                <input class="aap-input" id="aapAboutCtaText" type="text" placeholder="Visit Our Store" value="${escapeHtml(about.ctaText || '')}">
              </div>
              <div>
                <label class="aap-label">Button link</label>
                <input class="aap-input" id="aapAboutCtaLink" type="text" placeholder="https://instagram.com/…" value="${escapeHtml(about.ctaLink || '')}">
              </div>
            </div>
          </div>
        </div>
      </form>`;
    openModal({
      title: 'Edit About / Our Story',
      html,
      wide: true,
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: 'Save changes', kind: 'primary', onClick: async function (btn) {
            const payload = {
              label: document.getElementById('aapAboutLabel').value.trim(),
              title: document.getElementById('aapAboutTitle').value.trim(),
              body: document.getElementById('aapAboutBody').value,
              image: document.getElementById('aapImageUrl').value.trim(),
              ctaText: document.getElementById('aapAboutCtaText').value.trim(),
              ctaLink: document.getElementById('aapAboutCtaLink').value.trim()
            };
            if (!payload.title) return toast('Please add a heading.', 'error');
            btn.disabled = true; btn.textContent = 'Saving…';
            try {
              const res = await adminFetch('/api/admin/about', { method: 'PUT', body: JSON.stringify(payload) });
              state.site.about = res.data || payload;
              toast('About section updated', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Save failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Save changes';
            }
          }
        }
      ]
    });
    setTimeout(bindUploader, 0);
  }

  // ─── Testing & Setup tools ───
  async function renderToolsView() {
    const content = document.getElementById('aapContent');
    content.innerHTML = renderLoadingState();
    let status = null;
    try {
      const res = await adminFetch('/api/admin/integrations');
      status = res.data;
    } catch (err) {
      content.innerHTML = `<div class="aap-empty">Failed to load integration status: ${escapeHtml(err.message)}</div>`;
      return;
    }

    const dot = (ok) => `<span class="aap-status-dot ${ok ? 'on' : 'off'}"></span>${ok ? 'Configured' : 'Not configured'}`;

    content.innerHTML = `
      <div class="aap-tools-grid">
        <div class="aap-tool-card">
          <h3><i class="fas fa-envelope"></i> Email alerts</h3>
          <p class="aap-tool-status">${dot(status.email.configured)}</p>
          <p class="aap-hint">Order confirmations to customers and alerts to you. Recipient: <strong>${escapeHtml(status.email.recipient || '—')}</strong></p>
          <div class="aap-tool-row">
            <input class="aap-input" id="aapTestEmailTo" type="email" placeholder="Send test to (optional)">
            <button class="aap-btn-primary" id="aapTestEmail"><i class="fas fa-paper-plane"></i> Send test email</button>
          </div>
        </div>

        <div class="aap-tool-card">
          <h3><i class="fab fa-whatsapp"></i> WhatsApp alerts</h3>
          <p class="aap-tool-status">${dot(status.whatsapp.configured)}</p>
          <p class="aap-hint">Instant WhatsApp message to you (${escapeHtml(status.whatsapp.phone || '—')}) on every new order.</p>
          <div class="aap-tool-row">
            <button class="aap-btn-primary" id="aapTestWhatsapp"><i class="fas fa-paper-plane"></i> Send test WhatsApp</button>
          </div>
        </div>

        <div class="aap-tool-card">
          <h3><i class="fas fa-credit-card"></i> Payments (Razorpay)</h3>
          <p class="aap-tool-status">${dot(status.razorpay.configured)}</p>
          <p class="aap-hint">Required to accept real online payments at checkout.</p>
        </div>

        <div class="aap-tool-card">
          <h3><i class="fas fa-truck"></i> Shipping rate</h3>
          <p class="aap-hint">Flat shipping added once per cart at checkout (website + Android app).</p>
          <div class="aap-tool-row">
            <input class="aap-input" id="aapShippingRate" type="number" min="0" step="1" placeholder="120">
            <button class="aap-btn-primary" id="aapSaveShipping"><i class="fas fa-save"></i> Save rate</button>
          </div>
          <p class="aap-hint" id="aapShippingStatus" style="margin-top:8px;"></p>
        </div>

        <div class="aap-tool-card">
          <h3><i class="fas fa-map-location-dot"></i> Address autocomplete</h3>
          <p class="aap-tool-status">${dot(status.maps.configured)}</p>
          <p class="aap-hint">Google Maps Places for faster address entry at checkout.</p>
        </div>
      </div>

      <div class="aap-section-block">
        <div class="aap-block-head">
          <div>
            <h3><i class="fas fa-vial"></i> Place a test order (₹1)</h3>
            <p class="aap-hint" style="margin:4px 0 0;">Creates a real order record for ₹1 and fires the same email + WhatsApp alerts a customer order would, so you can see exactly what happens. Marked as a test.</p>
          </div>
        </div>
        <form class="aap-form" id="aapTestOrderForm">
          <div class="aap-form-row">
            <div><label class="aap-label">Customer name</label><input class="aap-input" id="aapToName" type="text" placeholder="Test Customer"></div>
            <div><label class="aap-label">Phone</label><input class="aap-input" id="aapToPhone" type="text" placeholder="9876543210"></div>
          </div>
          <div class="aap-form-row">
            <div><label class="aap-label">Email <span class="aap-label-sub">(gets the confirmation)</span></label><input class="aap-input" id="aapToEmail" type="email" placeholder="you@example.com"></div>
            <div><label class="aap-label">Item name</label><input class="aap-input" id="aapToItem" type="text" placeholder="Test Order Item" value="Test Order Item"></div>
          </div>
          <label class="aap-label">Shipping address</label>
          <textarea class="aap-input" id="aapToAddress" rows="2" placeholder="123 Test Lane, City, State - 000000"></textarea>
          <div style="margin-top:14px;">
            <button type="button" class="aap-btn-primary" id="aapPlaceTestOrder"><i class="fas fa-rocket"></i> Place ₹1 test order</button>
          </div>
        </form>
        <div id="aapTestOrderResult"></div>
      </div>`;

    const shippingInput = content.querySelector('#aapShippingRate');
    const shippingStatus = content.querySelector('#aapShippingStatus');
    try {
      const settingsRes = await fetch('/api/settings');
      const settingsJson = await settingsRes.json();
      if (settingsJson.success && settingsJson.data && shippingInput) {
        shippingInput.value = settingsJson.data.shippingFlatRate ?? 120;
        if (shippingStatus) {
          shippingStatus.textContent = `Current flat rate: ₹${settingsJson.data.shippingFlatRate ?? 120}`;
        }
      }
    } catch (_) { }

    content.querySelector('#aapSaveShipping')?.addEventListener('click', async function () {
      const rate = Number(shippingInput?.value);
      if (!Number.isFinite(rate) || rate < 0) {
        toast('Enter a valid shipping amount', 'error');
        return;
      }
      this.disabled = true;
      const orig = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
      try {
        const res = await adminFetch('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({ shippingFlatRate: Math.round(rate) })
        });
        if (shippingStatus) {
          shippingStatus.textContent = `Saved — flat rate is now ₹${res.data.shippingFlatRate}`;
        }
        toast('Shipping rate updated', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
      this.disabled = false;
      this.innerHTML = orig;
    });

    content.querySelector('#aapTestEmail').addEventListener('click', async function () {
      const to = content.querySelector('#aapTestEmailTo').value.trim();
      this.disabled = true; const orig = this.innerHTML; this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
      try {
        const res = await adminFetch('/api/admin/test-email', { method: 'POST', body: JSON.stringify({ to }) });
        toast(`Test email sent to ${res.data.sentTo}`, 'success');
      } catch (err) { toast(err.message, 'error'); }
      this.disabled = false; this.innerHTML = orig;
    });

    content.querySelector('#aapTestWhatsapp').addEventListener('click', async function () {
      this.disabled = true; const orig = this.innerHTML; this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
      try {
        await adminFetch('/api/admin/test-whatsapp', { method: 'POST' });
        toast('Test WhatsApp message sent', 'success');
      } catch (err) { toast(err.message, 'error'); }
      this.disabled = false; this.innerHTML = orig;
    });

    content.querySelector('#aapPlaceTestOrder').addEventListener('click', async function () {
      const payload = {
        name: content.querySelector('#aapToName').value.trim(),
        phone: content.querySelector('#aapToPhone').value.trim(),
        email: content.querySelector('#aapToEmail').value.trim(),
        itemName: content.querySelector('#aapToItem').value.trim(),
        address: content.querySelector('#aapToAddress').value.trim()
      };
      this.disabled = true; const orig = this.innerHTML; this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing…';
      const resultEl = content.querySelector('#aapTestOrderResult');
      try {
        const res = await adminFetch('/api/admin/test-order', { method: 'POST', body: JSON.stringify(payload) });
        const d = res.data;
        let fcmLine = '';
        if (d.fcm) {
          const f = d.fcm;
          const fcmText = f.error ? f.error : (f.skipped ? (f.reason || 'skipped') : `sent to ${f.sent || 0} device(s)`);
          fcmLine = `<li>FCM push: <strong>${escapeHtml(fcmText)}</strong></li>`;
        }
        resultEl.innerHTML = `
          <div class="aap-tool-result">
            <p><i class="fas fa-check-circle" style="color:#3ba35a;"></i> Test order <strong>${escapeHtml(d.order)}</strong> created.</p>
            <ul>
              <li>Admin email: <strong>${escapeHtml(String(d.adminEmail))}</strong></li>
              <li>Customer email: <strong>${escapeHtml(String(d.customerEmail))}</strong></li>
              <li>WhatsApp: <strong>${escapeHtml(String(d.whatsapp))}</strong></li>
              ${fcmLine}
            </ul>
          </div>`;
        toast('Test order placed', 'success');
      } catch (err) {
        toast(err.message, 'error');
        resultEl.innerHTML = `<div class="aap-tool-result error"><i class="fas fa-times-circle"></i> ${escapeHtml(err.message)}</div>`;
      }
      this.disabled = false; this.innerHTML = orig;
    });
  }

  // Shared image-form markup used by hero & hamper modals (reuses uploader element IDs)
  function imageFormHtml({ image, captionLabel, captionValue, captionPlaceholder, extra }) {
    return `
      <form class="aap-form">
        <label class="aap-label">Image</label>
        <div class="aap-uploader" id="aapUploader">
          <div class="aap-uploader-preview" id="aapPreview">
            ${image ? `<img src="${escapeHtml(resolveImage(image))}" alt="">` : `<div class="aap-uploader-placeholder"><i class="fas fa-image"></i><p>Drag &amp; drop or click to upload</p><span>JPG, PNG, WEBP up to 8&nbsp;MB</span></div>`}
          </div>
          <input type="file" id="aapImageFile" accept="image/*" hidden>
          <div class="aap-uploader-actions">
            <button type="button" class="aap-btn-secondary" id="aapPickImage"><i class="fas fa-upload"></i> Choose file</button>
            <input type="text" id="aapImageUrl" class="aap-input" placeholder="or paste image URL/path" value="${escapeHtml(image || '')}">
          </div>
          <p class="aap-uploader-hint" id="aapUploadStatus"></p>
        </div>
        <label class="aap-label">${escapeHtml(captionLabel)}</label>
        <input class="aap-input" id="aapCaption" type="text" placeholder="${escapeHtml(captionPlaceholder || '')}" value="${escapeHtml(captionValue || '')}">
        ${extra || ''}
      </form>`;
  }

  // ─── Modal helpers ───
  function openModal({ title, html, actions, wide }) {
    const host = ensureAdminPanel().querySelector('#aapModalHost');
    host.innerHTML = `
      <div class="aap-modal-backdrop">
        <div class="aap-modal-card${wide ? ' wide' : ''}">
          <header class="aap-modal-header">
            <h3>${escapeHtml(title)}</h3>
            <button class="aap-icon-btn" id="aapModalClose" aria-label="Close"><i class="fas fa-times"></i></button>
          </header>
          <div class="aap-modal-body">${html}</div>
          <footer class="aap-modal-footer">
            ${(actions || []).map((a, i) => `<button class="aap-btn-${a.kind || 'primary'}" data-modal-action="${i}">${escapeHtml(a.label)}</button>`).join('')}
          </footer>
        </div>
      </div>`;
    host.classList.add('open');
    host.querySelector('#aapModalClose').addEventListener('click', closeModal);
    host.querySelector('.aap-modal-backdrop').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    (actions || []).forEach((a, i) => {
      const btn = host.querySelector(`[data-modal-action="${i}"]`);
      if (btn) btn.addEventListener('click', function () { a.onClick(btn); });
    });
  }

  function closeModal() {
    const host = document.getElementById('aapModalHost');
    if (host) {
      host.classList.remove('open');
      host.innerHTML = '';
    }
  }

  // ─── Public entry points & nav icon ───
  async function openAdminModal() {
    // If we don't yet have an admin session but a user is signed in, make sure
    // their profile is loaded so we can detect admin role and skip re-login.
    if (!getEffectiveAdminToken() && getUserAuthToken() && window.AuraAuth && typeof window.AuraAuth.refreshUser === 'function') {
      try { await window.AuraAuth.refreshUser(); } catch (e) {}
    }
    if (!getEffectiveAdminToken()) {
      openLoginModal();
      try { history.pushState({ auraOverlay: 'admin' }, '', '#admin'); } catch (e) {}
      return;
    }
    openAdminPanel();
    try { history.pushState({ auraOverlay: 'admin' }, '', '#admin'); } catch (e) {}
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
      const panel = document.getElementById('auraAdminPanel');
      if (panel && panel.classList.contains('open')) {
        panel.classList.remove('open');
        document.body.classList.remove('aura-admin-open');
      }
      const login = document.getElementById('auraAdminLogin');
      if (login) login.style.display = 'none';
    }
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const host = document.getElementById('aapModalHost');
      if (host && host.classList.contains('open')) {
        closeModal();
      } else {
        const panel = document.getElementById('auraAdminPanel');
        if (panel && panel.classList.contains('open')) closeAdminModal();
      }
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    ensureAdminIcon();
    updateAdminIcon();
    if (window.location.hash === '#admin') {
      setTimeout(openAdminModal, 200);
    }
  });

  // ─── Orders View ───
  async function renderOrdersView() {
    const content = document.getElementById('aapContent');
    content.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">Loading orders…</p>';
    try {
      const token = getEffectiveAdminToken();
      const res = await AuraApi.apiFetch('/api/admin/orders');
      const orders = Array.isArray(res.data) ? res.data : [];
      if (!orders.length) {
        content.innerHTML = '<div style="text-align:center;padding:60px;color:#999;"><i class="fas fa-inbox" style="font-size:3rem;margin-bottom:16px;display:block;color:var(--rose-gold);"></i><h3 style="margin:0 0 8px;">No orders yet</h3><p>When customers place orders, they will appear here.</p></div>';
        return;
      }
      const statusColors = {
        created: '#3b82f6', confirmed: '#8b5cf6', packed: '#f59e0b',
        shipped: '#06b6d4', delivered: '#22c55e', cancelled: '#ef4444'
      };
      const statusOptions = ['created', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
      const rows = orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(o => {
        const c = o.customer || {};
        const status = o.status || 'created';
        const color = statusColors[status] || '#888';
        const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
        const lines = (o.cart?.lines || []).map(l => `<div style="font-size:12px;padding:2px 0;">${escapeHtml(l.name)} x${l.qty} — ₹${l.lineTotal}</div>`).join('');
        const optionsHtml = statusOptions.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');
        return `
          <tr class="aap-order-row" data-order-id="${escapeHtml(o.id)}">
            <td style="font-weight:600;font-size:12px;color:var(--rose-gold);">${escapeHtml(o.id).slice(0, 8)}…</td>
            <td>${escapeHtml(c.name || '-')}</td>
            <td style="font-size:12px;">${escapeHtml(c.email || o.userEmail || '-')}</td>
            <td style="font-size:12px;">${date}</td>
            <td style="font-weight:600;">₹${o.cart?.grandTotal || 0}</td>
            <td><span style="background:${color};color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">${status}</span></td>
            <td>
              <select class="aap-order-status-select" data-order-id="${escapeHtml(o.id)}" style="padding:4px 8px;border-radius:8px;border:1px solid #ddd;font-size:11px;background:#fff;cursor:pointer;">
                ${optionsHtml}
              </select>
            </td>
          </tr>
          <tr class="aap-order-detail-row" style="display:none;">
            <td colspan="7" style="background:#fdf6f0;padding:12px 20px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;">
                <div><strong>Phone:</strong> ${escapeHtml(c.phone || '-')}<br><strong>Address:</strong> ${escapeHtml(c.address || '-')}</div>
                <div><strong>Items:</strong>${lines}<br><strong>Subtotal:</strong> ₹${o.cart?.subtotal || 0} | <strong>Shipping:</strong> ₹${o.cart?.shipping || 0}</div>
              </div>
            </td>
          </tr>`;
      }).join('');

      content.innerHTML = `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:2px solid var(--rose-gold);text-align:left;">
                <th style="padding:10px 8px;">Order ID</th>
                <th style="padding:10px 8px;">Customer</th>
                <th style="padding:10px 8px;">Email</th>
                <th style="padding:10px 8px;">Date</th>
                <th style="padding:10px 8px;">Total</th>
                <th style="padding:10px 8px;">Status</th>
                <th style="padding:10px 8px;">Update</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;

      // Expand/collapse order detail
      content.querySelectorAll('.aap-order-row').forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function(e) {
          if (e.target.closest('select')) return;
          const detail = row.nextElementSibling;
          if (detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
        });
      });

      // Status update
      content.querySelectorAll('.aap-order-status-select').forEach(sel => {
        sel.addEventListener('change', async function(e) {
          e.stopPropagation();
          const orderId = sel.dataset.orderId;
          const newStatus = sel.value;
          try {
            await AuraApi.apiFetch(`/api/admin/orders/${orderId}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: newStatus })
            });
            toast(`Order ${orderId.slice(0, 8)} updated to ${newStatus}`, 'success');
            renderOrdersView();
          } catch (err) {
            toast('Failed to update: ' + err.message, 'error');
          }
        });
      });
    } catch (err) {
      content.innerHTML = `<p style="color:#ef4444;text-align:center;padding:40px;">Failed to load orders: ${escapeHtml(err.message)}</p>`;
    }
  }

  // ─── Home Preview View ───
  function renderPreviewView() {
    const content = document.getElementById('aapContent');
    const siteUrl = window.location.origin + '/';
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;height:calc(100vh - 180px);gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;">
          <button class="aap-btn-secondary" id="aapPreviewRefresh"><i class="fas fa-sync-alt"></i> Refresh</button>
          <span style="font-size:12px;color:#888;">Live preview of your storefront as customers see it</span>
        </div>
        <iframe id="aapPreviewFrame" src="${siteUrl}" style="flex:1;border:2px solid rgba(183,110,121,0.2);border-radius:12px;background:#fff;width:100%;"></iframe>
      </div>`;
    content.querySelector('#aapPreviewRefresh').addEventListener('click', function() {
      const frame = document.getElementById('aapPreviewFrame');
      if (frame) frame.src = frame.src;
    });
  }

  window.AuraAdmin = { openAdminModal, updateAdminIcon };
})();
