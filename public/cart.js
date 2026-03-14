(() => {
  const api = window.apiClient || null;
  const page = document.querySelector('[data-page]')?.dataset.page || '';

  const state = {
    cart: {},
    products: [],
    lastOrder: null,
  };

  function showToast(msg, kind = 'info') {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.dataset.kind = kind;
    el.classList.add('visible');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('visible'), 2000);
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem('cart');
      state.cart = raw ? JSON.parse(raw) : {};
    } catch (err) {
      state.cart = {};
    }
  }

  function syncCartWithProducts() {
    if (!state.products.length) return;
    const byId = state.products.reduce((acc, p) => { acc[p._id] = p; return acc; }, {});
    const next = {};
    Object.values(state.cart || {}).forEach((item) => {
      const prod = byId[item._id];
      if (!prod) return;
      const stockVal = Number.isFinite(Number(prod.stock)) ? Number(prod.stock) : Infinity;
      const qty = Math.max(0, Math.min(Number(item.qty) || 1, stockVal));
      if (qty <= 0) return;
      next[item._id] = { ...prod, qty };
    });
    state.cart = next;
    saveCart();
  }

  function saveCart() {
    try {
      localStorage.setItem('cart', JSON.stringify(state.cart));
    } catch (_) {}
  }

  function loadLastOrder() {
    try {
      const raw = localStorage.getItem('lastOrder');
      state.lastOrder = raw ? JSON.parse(raw) : null;
    } catch (err) {
      state.lastOrder = null;
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed');
      state.products = await res.json();
    } catch (err) {
      state.products = [];
    }
  }

  function formatMoney(amount) {
    return `EGP ${Math.max(0, Math.round(Number(amount) || 0))}`;
  }

  function cartItems() {
    return Object.values(state.cart || {});
  }

  function subtotal() {
    return cartItems().reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
  }

  function renderCartTable() {
    const table = document.getElementById('cart-table');
    const countEl = document.getElementById('cart-count');
    const subEl = document.getElementById('cart-subtotal');
    const proceedBtn = document.getElementById('proceed-checkout');
    if (!table) return;

    const items = cartItems();
    if (countEl) countEl.textContent = items.reduce((s, i) => s + (i.qty || 0), 0);
    if (subEl) subEl.textContent = formatMoney(subtotal());

    if (!items.length) {
      table.innerHTML = '<div class="empty-state">Your cart is empty. Add products from the shop.</div>';
      if (proceedBtn) proceedBtn.classList.add('disabled');
      showToast('Cart is empty', 'warn');
      return;
    }
    if (proceedBtn) proceedBtn.classList.remove('disabled');

    const rows = items.map((it) => {
      const total = (Number(it.price) || 0) * (Number(it.qty) || 0);
      return `
        <div class="cart-row" data-id="${it._id}">
          <div class="cart-row-main">
            <img src="${it.image || ''}" alt="${escapeHtml(it.name)}" class="cart-thumb">
            <div>
              <div class="cart-name">${escapeHtml(it.name)}</div>
              <div class="cart-meta">${it.brand ? escapeHtml(it.brand) + ' · ' : ''}${formatMoney(it.price)}${Number(it.stock) <= 0 ? ' · Out of stock' : Number(it.stock) <= 3 ? ' · Low stock' : ''}</div>
            </div>
          </div>
          <div class="cart-row-actions">
            <div class="qty-control" data-id="${it._id}">
              <button class="qty-btn" data-act="dec">−</button>
              <span class="qty-val">${it.qty}</span>
              <button class="qty-btn" data-act="inc">+</button>
            </div>
            <div class="cart-line">${formatMoney(total)}</div>
            <button class="link-btn" data-act="remove" data-id="${it._id}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    table.innerHTML = rows;
  }

  function renderCheckoutSummary() {
    const itemsWrap = document.getElementById('checkout-summary-items');
    const countEl = document.getElementById('checkout-count');
    const subEl = document.getElementById('checkout-subtotal');
    if (!itemsWrap) return;
    const items = cartItems();
    if (countEl) countEl.textContent = items.reduce((s, i) => s + (i.qty || 0), 0);
    if (subEl) subEl.textContent = formatMoney(subtotal());
    if (!items.length) {
      itemsWrap.innerHTML = '<div class="empty-state">Cart empty. Add products first.</div>';
      return;
    }
    itemsWrap.innerHTML = items.map((it) => `
      <div class="summary-row">
        <span>${escapeHtml(it.name)} × ${it.qty}</span>
        <span>${formatMoney((Number(it.price) || 0) * (Number(it.qty) || 0))}</span>
      </div>
    `).join('');
  }

  function renderConfirmation() {
    const order = state.lastOrder;
    if (!order) return;
    const idEl = document.getElementById('confirm-order-id');
    const itemsEl = document.getElementById('confirm-items');
    const totalEl = document.getElementById('confirm-total');
    if (idEl) idEl.textContent = `Order: ${order._id || order.id || '—'}`;
    if (itemsEl) {
      itemsEl.innerHTML = (order.items || []).map((it) => `
        <div class="summary-row">
          <span>${escapeHtml(it.name)} × ${it.qty}</span>
          <span>${formatMoney((Number(it.price) || 0) * (Number(it.qty) || 0))}</span>
        </div>
      `).join('');
    }
    if (totalEl) totalEl.textContent = `Subtotal: ${formatMoney(order.subtotal || 0)}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]|'/g, (s) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
  }

  function bindCartEvents() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!target) return;
      if (target.dataset.act === 'remove') {
        delete state.cart[target.dataset.id];
        saveCart();
        renderCartTable();
      }
      if (target.classList.contains('qty-btn')) {
        const act = target.dataset.act;
        const parent = target.closest('.qty-control');
        const id = parent?.dataset.id;
        if (!id || !state.cart[id]) return;
        if (act === 'inc') {
          const prod = state.products.find((p) => String(p._id) === String(id));
          const stockVal = Number.isFinite(Number(prod?.stock)) ? Number(prod.stock) : Infinity;
          if (stockVal !== Infinity && state.cart[id].qty >= stockVal) {
            showToast(`Only ${stockVal} in stock`, 'warn');
            return;
          }
          state.cart[id].qty += 1;
        }
        if (act === 'dec') {
          state.cart[id].qty = Math.max(1, state.cart[id].qty - 1);
          if (state.cart[id].qty <= 0) delete state.cart[id];
        }
        saveCart();
        renderCartTable();
      }
    });
  }

  async function submitCheckout() {
    const form = document.getElementById('checkout-form');
    if (!form) return;
    const note = document.getElementById('checkout-note');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('checkout-name').value.trim();
      const mobile = document.getElementById('checkout-mobile').value.trim();
      const email = document.getElementById('checkout-email').value.trim();
      const address = document.getElementById('checkout-address').value.trim();
      const payment = form.querySelector('input[name="payment"]:checked')?.value || 'cash';

      const validMobile = /^(?:\+20|0)?(10|11|12|15)\d{8}$/.test(mobile);
      if (!name || !mobile || !address) {
        if (note) note.textContent = 'Please complete required fields.';
        showToast('Name, mobile, and address are required', 'warn');
        return;
      }
      if (!validMobile) {
        if (note) note.textContent = 'Enter a valid Egyptian mobile';
        showToast('Invalid mobile number', 'error');
        return;
      }
      const items = cartItems().map((it) => ({ productId: it._id, qty: it.qty }));
      if (!items.length) {
        if (note) note.textContent = 'Cart is empty.';
        return;
      }

      await fetchProducts();
      syncCartWithProducts();
      const priceMap = new Map(state.products.map((p) => [String(p._id), p]));
      const payloadItems = [];
      for (const it of items) {
        const prod = priceMap.get(String(it.productId));
        if (!prod) continue;
        if (Number(prod.stock) < Number(it.qty)) {
          if (note) note.textContent = `${prod.name} only has ${prod.stock} in stock.`;
          showToast(`${prod.name} limited to ${prod.stock}`, 'warn');
          return;
        }
        payloadItems.push({ productId: prod._id, qty: it.qty });
      }
      if (!payloadItems.length) {
        if (note) note.textContent = 'Products unavailable. Please refresh.';
        return;
      }

      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payloadItems, clientMobile: mobile, paymentMethod: payment, shippingAddress: address, email, name }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Order failed');
        }
        const order = await res.json();
        localStorage.setItem('lastOrder', JSON.stringify(order));
        // clear cart
        state.cart = {};
        saveCart();
        showToast('Order placed', 'success');
        window.location.href = '/cart-confirmation';
      } catch (err) {
        if (note) note.textContent = err.message || 'Order failed';
        showToast(err.message || 'Order failed', 'error');
      }
    });
  }

  async function initCartPage() {
    loadCart();
    await fetchProducts();
    syncCartWithProducts();
    renderCartTable();
    bindCartEvents();
  }

  async function initCheckoutPage() {
    loadCart();
    await fetchProducts();
    syncCartWithProducts();
    renderCheckoutSummary();
    submitCheckout();
  }

  function initConfirmationPage() {
    loadLastOrder();
    renderConfirmation();
  }

  function init() {
    if (page === 'cart') initCartPage();
    if (page === 'checkout') initCheckoutPage();
    if (page === 'confirmation') initConfirmationPage();
    if (page === 'payment') loadLastOrder();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
