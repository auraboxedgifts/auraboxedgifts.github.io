(function () {
  const TOKEN_KEY = 'auraAdminToken';
  const state = {
    products: [],
    collections: [],
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
    const token = getAdminToken();
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
    panel.querySelector('#aapLogout').addEventListener('click', function () {
      setAdminToken(null);
      closeAdminModal();
      setTimeout(openAdminModal, 200);
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
    if (!getAdminToken()) {
      openLoginModal();
      return;
    }
    await reloadAll();
  }

  async function reloadAll() {
    const content = document.getElementById('aapContent');
    if (content) content.innerHTML = renderLoadingState();
    try {
      const [productsRes, collectionsRes] = await Promise.all([
        adminFetch('/api/admin/products'),
        adminFetch('/api/admin/collections')
      ]);
      state.products = productsRes.data || [];
      state.collections = collectionsRes.data || [];
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
    } else if (state.view === 'help') {
      title.textContent = 'Quick Help';
      sub.textContent = 'Tips to manage your catalog without writing any code.';
      renderHelpView();
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
          <button class="aap-btn-secondary" id="aapRegenerate" title="Force-rebuild collection pages"><i class="fas fa-bolt"></i> Republish pages</button>
          <button class="aap-btn-primary" id="aapNewProduct"><i class="fas fa-plus"></i> New Product</button>
        </div>
        ${state.activeCollection !== 'all' ? `<p class="aap-hint"><i class="fas fa-grip-vertical"></i> Drag any card to reorder products in <strong>${escapeHtml(state.collections.find(c => c.slug === state.activeCollection)?.name || state.activeCollection)}</strong>.</p>` : '<p class="aap-hint"><i class="fas fa-info-circle"></i> Pick a single collection above to enable drag-to-reorder.</p>'}
      </div>`;

    let grid = '';
    if (!products.length) {
      grid = `<div class="aap-empty">
        <i class="far fa-folder-open"></i>
        <h3>No products match your filters</h3>
        <p>Try a different collection or clear the search box.</p>
        <button class="aap-btn-primary" id="aapEmptyAdd"><i class="fas fa-plus"></i> Add a new product</button>
      </div>`;
    } else {
      grid = `<div class="aap-grid" id="aapProductGrid">
        ${products.map(productCard).join('')}
      </div>`;
    }

    content.innerHTML = stat + toolbar + grid;

    content.querySelector('#aapSearch').addEventListener('input', function (e) {
      state.search = e.target.value;
      const items = content.querySelectorAll('.aap-card');
      const visible = getFilteredProducts();
      const visibleIds = new Set(visible.map((p) => p.id));
      items.forEach((card) => {
        card.style.display = visibleIds.has(card.dataset.id) ? '' : 'none';
      });
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
    content.querySelector('#aapRegenerate').addEventListener('click', regeneratePages);

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
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', card.dataset.id); } catch (err) {}
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        commitReorder(grid);
      });
    });
    grid.addEventListener('dragover', function (e) {
      e.preventDefault();
      const dragging = grid.querySelector('.aap-card.dragging');
      if (!dragging) return;
      const after = getDragAfterElement(grid, e.clientX, e.clientY);
      if (after == null) {
        grid.appendChild(dragging);
      } else {
        grid.insertBefore(dragging, after);
      }
    });
  }

  function getDragAfterElement(container, x, y) {
    const draggables = [...container.querySelectorAll('.aap-card:not(.dragging)')];
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
          headers: { Authorization: `Bearer ${getAdminToken()}` },
          body: form
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
        const url = data.data?.url || data.url;
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
            if (!name) return toast('Please enter a name.', 'error');
            btn.disabled = true; btn.textContent = isEdit ? 'Saving…' : 'Creating…';
            try {
              if (isEdit) {
                const res = await adminFetch(`/api/admin/collections/${encodeURIComponent(coll.slug)}`, {
                  method: 'PUT',
                  body: JSON.stringify({ name, description })
                });
                const updated = res.data;
                const idx = state.collections.findIndex((c) => c.slug === coll.slug);
                if (idx !== -1 && updated) state.collections[idx] = updated;
                toast('Collection updated', 'success');
              } else {
                const res = await adminFetch('/api/admin/collections', {
                  method: 'POST',
                  body: JSON.stringify({ name, slug, description })
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
  }

  function confirmDeleteCollection(coll, productCount) {
    const warn = productCount > 0
      ? `<p style="margin-bottom:10px;color:#a4502b;"><i class="fas fa-exclamation-triangle"></i> This collection has <strong>${productCount}</strong> product${productCount === 1 ? '' : 's'}. Tick the box below to remove them too.</p>
         <label class="aap-checkbox"><input type="checkbox" id="aapCollForce"> Also delete the ${productCount} product${productCount === 1 ? '' : 's'} in this collection.</label>`
      : `<p>This collection has no products. Safe to delete.</p>`;
    openModal({
      title: `Delete "${coll.name}"?`,
      html: warn,
      actions: [
        { label: 'Cancel', kind: 'secondary', onClick: closeModal },
        {
          label: 'Delete collection', kind: 'danger', onClick: async function (btn) {
            const force = document.getElementById('aapCollForce')?.checked;
            if (productCount > 0 && !force) return toast('Tick the box to confirm.', 'error');
            btn.disabled = true; btn.textContent = 'Deleting…';
            try {
              await adminFetch(`/api/admin/collections/${encodeURIComponent(coll.slug)}${force ? '?force=1' : ''}`, { method: 'DELETE' });
              state.collections = state.collections.filter((c) => c.slug !== coll.slug);
              if (force) state.products = state.products.filter((p) => p.collection !== coll.slug);
              toast('Collection deleted', 'success');
              closeModal();
              renderView();
            } catch (err) {
              toast(`Delete failed: ${err.message}`, 'error');
              btn.disabled = false; btn.textContent = 'Delete collection';
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
          <p>Collections appear as categories on your shop. Create, rename, or delete them from the Collections tab.</p>
        </div>
      </div>`;
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
  function openAdminModal() {
    if (!getAdminToken()) {
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

  window.AuraAdmin = { openAdminModal, updateAdminIcon };
})();
