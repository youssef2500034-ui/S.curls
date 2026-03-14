// Admin Product Management
const bc = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('products') : null;
const prodStatus = document.getElementById('prod-status');
const prodList = document.getElementById('admin-products-list');
const prodForm = document.getElementById('product-form');
const prodFile = document.getElementById('prod-file');
const prodImageUrl = document.getElementById('prod-image-url');
const productPanel = document.getElementById('product-panel');
const productShell = document.querySelector('.product-shell');
const prodPreview = document.createElement('div');
prodPreview.className = 'prod-preview';
if (prodImageUrl?.parentElement) prodImageUrl.parentElement.appendChild(prodPreview);

async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

async function addProduct(product, file) {
  const fd = new FormData();
  fd.append('name', product.name || '');
  fd.append('description', product.description || '');
  fd.append('price', product.price ?? '');
  fd.append('stock', product.stock ?? '');
  fd.append('brand', product.brand || '');
  fd.append('category', product.category || 'general');
  if (file) {
    fd.append('image', file);
  } else if (product.image) {
    fd.append('image', product.image);
  }

  const res = await fetch('/api/products', {
    method: 'POST',
    body: fd
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Create failed');
  return res.json();
}

async function updateProduct(id, product) {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Update failed');
  return res.json();
}

async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: 'DELETE' });
}

function renderProducts(products) {
  if (!prodList) return;
  if (!products?.length) {
    prodList.innerHTML = '<p class="hint">No products yet.</p>';
    return;
  }
  prodList.innerHTML = products.map(p => `
    <div class="admin-prod-card">
      <div class="admin-prod-top">
        <img src="${p.image || ''}" class="admin-prod-img" alt="${p.name || ''}">
        <div class="admin-prod-meta">
          <div class="pill cat">${p.category || 'general'}</div>
          <div class="pill brand">${p.brand || '—'}</div>
          ${(() => {
            const stockVal = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
            const stockLabel = stockVal <= 0 ? 'Out of stock' : `Stock: ${stockVal}`;
            const stockClass = stockVal <= 0 ? 'out' : stockVal <= 3 ? 'low' : 'ok';
            return `<div class="pill stock ${stockClass}">${stockLabel}</div>`;
          })()}
        </div>
      </div>
      <input type="text" value="${p.name}" class="edit-name" data-id="${p._id}" placeholder="Name">
      <textarea class="edit-desc" data-id="${p._id}" placeholder="Description">${p.description || ''}</textarea>
      <input type="text" value="${p.image || ''}" class="edit-image" data-id="${p._id}" placeholder="Image URL">
      <div class="grid-2">
        <input type="text" value="${p.brand || ''}" class="edit-brand" data-id="${p._id}" placeholder="Brand">
        <input type="text" value="${p.category || ''}" class="edit-category" data-id="${p._id}" placeholder="Category">
      </div>
      <div class="grid-2">
        <input type="number" value="${p.price}" class="edit-price" data-id="${p._id}" placeholder="Price">
        <input type="number" value="${p.stock}" class="edit-stock" data-id="${p._id}" placeholder="Stock">
      </div>
      <div class="row-actions">
        <button class="save-prod-btn" data-id="${p._id}">Save</button>
        <button class="delete-prod-btn" data-id="${p._id}">Delete</button>
      </div>
    </div>
  `).join('');
}

async function setupAdminProducts() {
  let products = await fetchProducts();
  renderProducts(products);

  prodFile?.addEventListener('change', () => {
    const file = prodFile.files?.[0];
    if (!file) { prodPreview.innerHTML = ''; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result;
      prodPreview.innerHTML = url ? `<img src="${url}" alt="preview">` : '';
    };
    reader.readAsDataURL(file);
  });

  prodForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const file = prodFile?.files?.[0];
    const product = {
      name: document.getElementById('prod-name')?.value?.trim(),
      description: document.getElementById('prod-desc')?.value || '',
      price: Number(document.getElementById('prod-price')?.value),
      image: prodImageUrl?.value?.trim() || '',
      stock: Number(document.getElementById('prod-stock')?.value || 0),
      brand: document.getElementById('prod-brand')?.value || '',
      category: document.getElementById('prod-category')?.value || 'general',
    };

    if (!product.name) { prodStatus.textContent = 'Name is required'; prodStatus.dataset.state = 'error'; return; }
    if (Number.isNaN(product.price) || product.price < 0) { prodStatus.textContent = 'Price must be positive'; prodStatus.dataset.state = 'error'; return; }

    try {
      await addProduct(product, file);
      products = await fetchProducts();
      renderProducts(products);
      if (bc) bc.postMessage({ action: 'refresh' });
      prodStatus.textContent = 'Product added!';
      prodStatus.dataset.state = 'success';
      if (typeof showToast === 'function') showToast('Product saved', 'success');
      e.target.reset();
      prodPreview.innerHTML = '';
    } catch (err) {
      prodStatus.textContent = err.message || 'Create failed';
      prodStatus.dataset.state = 'error';
      if (typeof showToast === 'function') showToast(err.message || 'Create failed', 'error');
    }
    setTimeout(() => { prodStatus.textContent = ''; prodStatus.dataset.state = ''; }, 1800);
  });

  document.getElementById('admin-products-list').addEventListener('click', async e => {
    if (e.target.classList.contains('delete-prod-btn')) {
      await deleteProduct(e.target.dataset.id);
      products = await fetchProducts();
      renderProducts(products);
      if (bc) bc.postMessage({ action: 'refresh' });
      if (typeof showToast === 'function') showToast('Product deleted', 'info');
    }
    if (e.target.classList.contains('save-prod-btn')) {
      const id = e.target.dataset.id;
      const name = document.querySelector(`.edit-name[data-id="${id}"]`).value;
      const price = Number(document.querySelector(`.edit-price[data-id="${id}"]`).value);
      const stock = Number(document.querySelector(`.edit-stock[data-id="${id}"]`).value);
      const brand = document.querySelector(`.edit-brand[data-id="${id}"]`)?.value || '';
      const category = document.querySelector(`.edit-category[data-id="${id}"]`)?.value || '';
      const description = document.querySelector(`.edit-desc[data-id="${id}"]`)?.value || '';
      const image = document.querySelector(`.edit-image[data-id="${id}"]`)?.value || '';
      await updateProduct(id, { name, price, stock, brand, category, description, image });
      products = await fetchProducts();
      renderProducts(products);
      if (bc) bc.postMessage({ action: 'refresh' });
      if (typeof showToast === 'function') showToast('Product updated', 'success');
    }
  });
}

// Show product panel when any product trigger is used
function openProductPanel() {
  if (productPanel) {
    productPanel.hidden = false;
    productPanel.style.display = 'block';
    productPanel.classList.add('is-open');
  }
  if (productShell) productShell.classList.add('is-open');
}

document.getElementById('add-product')?.addEventListener('click', openProductPanel);

setupAdminProducts();
