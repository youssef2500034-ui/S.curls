document.addEventListener('DOMContentLoaded', () => {
  const filterPills = document.querySelectorAll('.filter-pill');
  const grid = document.querySelector('.shop-grid');
  const countLabel = document.getElementById('filter-count');
  const productCount = document.getElementById('product-count');
  const toast = createToast();

  let products = [];
  let visibleProducts = [];
  let favorites = loadFavs();
  let cart = {};
  let currentFilter = 'all';

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      return await res.json();
    } catch (err) {
      toast.show('Failed to load products');
      return [];
    }
  }

  // Listen for cross-tab product changes and refresh immediately
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('products');
      bc.onmessage = async (ev) => {
        const data = ev.data;
        if (!data) return;
        if (data.action === 'refresh') {
          products = await fetchProducts();
          productCount.textContent = products.length;
          renderProducts(products);
          applyFilter(currentFilter || 'all');
          toast.show('Shop updated');
        }
      };
    } catch (err) {
      // ignore
    }
  }

  function buildProductCard(p) {
    const stockVal = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
    const out = stockVal <= 0;
    const art = document.createElement('article');
    art.className = `shot product${out ? ' is-oos' : ''}`;
    art.dataset.id = p._id || `prod-${Date.now()}`;
    art.dataset.tags = (p.category || '').toLowerCase();
    art.innerHTML = `
      <img src="${p.image || ''}" alt="${escapeHtml(p.name || 'Product')}">
      <div class="shot-overlay">
        <div class="shot-top">
          <span class="shot-badge">${escapeHtml(p.brand || '')}</span>
          <span class="shot-badge stock ${out ? 'oos' : stockVal <= 3 ? 'low' : 'ok'}">${out ? 'Out of stock' : stockVal + ' in stock'}</span>
        </div>
        <h3>${escapeHtml(p.name || '')}</h3>
        <p class="shop-desc">${escapeHtml(p.description || '')}</p>
        <div class="shot-actions">
          <button class="shot-fav" data-fav>♡ Save</button>
          <div class="action-row">
            <button class="shot-cta add-cart-btn" data-add ${out ? 'disabled aria-disabled="true"' : ''}>${out ? 'Out of stock' : '🛒 Add'}</button>
            <span class="shop-price">$${p.price || 0}</span>
          </div>
        </div>
      </div>
    `;
    // Fallback styling when no image URL
    if (!p.image) {
      art.classList.add('no-image');
    }
    return art;
  }

  function renderProducts(list) {
    grid.innerHTML = '';
    list.forEach((p) => {
      const card = buildProductCard(p);
      grid.appendChild(card);
      wireProduct(card, p);
    });
    visibleProducts = Array.from(grid.querySelectorAll('.product'));
    updateCount();
  }

  function wireProduct(el, product) {
    const favBtn = el.querySelector('[data-fav]');
    const addBtn = el.querySelector('[data-add]');
    const id = el.dataset.id;

    if (favBtn) {
      if (id && favorites.has(id)) {
        favBtn.classList.add('on');
        favBtn.textContent = '♥ Saved';
      }
      favBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isFav = favorites.has(id);
        if (isFav) {
          favorites.delete(id);
          favBtn.classList.remove('on');
          favBtn.textContent = '♡ Save';
          toast.show('Removed from saved');
        } else {
          favorites.add(id);
          favBtn.classList.add('on');
          favBtn.textContent = '♥ Saved';
          toast.show('Saved product');
        }
        persistFavs();
        if (currentFilter === 'favs') applyFilter('favs');
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addToCart(product);
      });
    }
  }

  function applyFilter(tag) {
    currentFilter = tag;
    let visible = 0;
    visibleProducts.forEach((el) => {
      const tags = (el.dataset.tags || '').toLowerCase();
      const id = el.dataset.id;
      const match =
        tag === 'all' || (tag === 'favs' ? (id && favorites.has(id)) : tags.split(',').map(t => t.trim()).includes(tag));
      el.style.display = match ? 'block' : 'none';
      if (match) visible += 1;
    });
    if (countLabel) countLabel.textContent = `${visible} product${visible === 1 ? '' : 's'}`;
  }

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      applyFilter(pill.dataset.filter || 'all');
    });
  });

  // Cart functions
  function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const subtotal = Object.values(cart).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    cartItems.innerHTML = Object.values(cart).map(item => `
      <li class="cart-row" data-id="${item._id}">
        <img src="${item.image || ''}" class="cart-img">
        <div class="cart-col">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="cart-meta">${Number(item.stock) <= 0 ? 'Out of stock' : Number(item.stock) <= 3 ? 'Low stock' : ''}</span>
          <div class="cart-qty">
            <button class="qty-btn qty-decrease" data-id="${item._id}">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn qty-increase" data-id="${item._id}">+</button>
          </div>
        </div>
        <div class="cart-price">$${Number(item.price || 0) * Number(item.qty || 0)}</div>
        <button class="remove-cart-btn" data-id="${item._id}">Remove</button>
      </li>
    `).join('');
    document.getElementById('cart-subtotal').textContent = `Subtotal: $${subtotal}`;
    persistCart();
    updateFloatingBadge();
  }

  function addToCart(product) {
    const stockVal = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
    if (stockVal <= 0) {
      toast.show('This item is out of stock');
      return;
    }
    const id = product._id;
    if (!cart[id]) cart[id] = { ...product, qty: 1 };
    else if (cart[id].qty >= stockVal) {
      toast.show(`Only ${stockVal} in stock`);
      return;
    } else {
      cart[id].qty += 1;
    }
    toast.show('Added to cart');
    renderCart();
    // Auto open cart on mobile for quick checkout
    if (window.matchMedia('(max-width: 900px)').matches) {
      const sidebar = document.getElementById('cart-sidebar');
      sidebar?.classList.add('open');
    }
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    if (target.classList && target.classList.contains('remove-cart-btn')) {
      const id = target.dataset.id;
      delete cart[id];
      renderCart();
    }
    if (target.classList && target.classList.contains('qty-increase')) {
      const id = target.dataset.id;
      if (cart[id]) {
        const stockVal = Number.isFinite(Number(cart[id].stock)) ? Number(cart[id].stock) : 0;
        if (stockVal > 0 && cart[id].qty >= stockVal) {
          toast.show(`Only ${stockVal} in stock`);
          return;
        }
        cart[id].qty += 1;
      }
      renderCart();
    }
    if (target.classList && target.classList.contains('qty-decrease')) {
      const id = target.dataset.id;
      if (cart[id]) {
        cart[id].qty = Math.max(1, cart[id].qty - 1);
        if (cart[id].qty === 0) delete cart[id];
      }
      renderCart();
    }
    if (target.classList && target.classList.contains('close-cart')) {
      const sidebar = document.getElementById('cart-sidebar');
      sidebar?.classList.remove('open');
    }
    if (target.id === 'floating-cart-btn' || target.closest && target.closest('#floating-cart-btn')) {
      toggleCart();
    }
  });

  document.getElementById('checkout-btn').addEventListener('click', () => {
    window.location.href = '/cart-checkout';
  });

  // Persistence for cart
  function loadCart() {
    try {
      const raw = localStorage.getItem('cart');
      if (raw) return JSON.parse(raw);
    } catch (err) {}
    return {};
  }

  function persistCart() {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (err) {}
  }

  function updateFloatingBadge() {
    const badge = document.getElementById('floating-cart-badge');
    const qty = Object.values(cart).reduce((s, it) => s + (it.qty || 0), 0);
    if (badge) badge.textContent = qty || '';
  }

  function createFloatingCart() {
    if (document.getElementById('floating-cart-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'floating-cart-btn';
    btn.className = 'floating-cart';
    btn.innerHTML = '🛒<span id="floating-cart-badge" class="floating-badge"></span>';
    document.body.appendChild(btn);
  }

  function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
  }

  // Helpers
  function loadFavs() {
    try {
      const raw = localStorage.getItem('favProducts');
      if (raw) return new Set(JSON.parse(raw));
    } catch (err) {}
    return new Set();
  }

  function persistFavs() {
    try {
      localStorage.setItem('favProducts', JSON.stringify(Array.from(favorites)));
    } catch (err) {}
  }

  function createToast() {
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    let timer;
    return {
      show(msg) {
        el.textContent = msg;
        el.classList.add('visible');
        clearTimeout(timer);
        timer = setTimeout(() => el.classList.remove('visible'), 1600);
      }
    };
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (s) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s];
    });
  }

  function syncCartWithProducts() {
    if (!products.length) return;
    const byId = products.reduce((acc, p) => { acc[p._id] = p; return acc; }, {});
    const next = {};
    Object.values(cart).forEach((item) => {
      const prod = byId[item._id];
      if (!prod) return; // drop removed products
      const stockVal = Number.isFinite(Number(prod.stock)) ? Number(prod.stock) : 0;
      const qty = Math.max(0, Math.min(Number(item.qty) || 1, stockVal || Infinity));
      if (qty <= 0) return;
      next[item._id] = { ...prod, qty };
    });
    cart = next;
    persistCart();
  }

  async function init() {
    products = await fetchProducts();
    if (!Array.isArray(products)) products = [];
    productCount.textContent = products.length;
    // load persisted cart and sync with latest products/stock
    cart = loadCart();
    syncCartWithProducts();
    createFloatingCart();
    renderProducts(products);
    applyFilter('all');
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden) init();
    });
    // Poll for product updates every 12 seconds and update if new products appear
    let knownIds = new Set(products.map(p => String(p._id)));
    setInterval(async () => {
      try {
        const latest = await fetchProducts();
        if (!Array.isArray(latest)) return;
        const latestIds = new Set(latest.map(p => String(p._id)));
        // detect any new id
        let changed = false;
        if (latestIds.size !== knownIds.size) changed = true;
        else {
          for (const id of latestIds) if (!knownIds.has(id)) { changed = true; break; }
        }
        if (changed) {
          products = latest;
          productCount.textContent = products.length;
          syncCartWithProducts();
          renderProducts(products);
          applyFilter(currentFilter || 'all');
          renderCart();
          toast.show('Shop updated');
          knownIds = latestIds;
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 12000);
  }

  init();

});
