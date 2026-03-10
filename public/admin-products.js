// Admin Product Management
async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

async function addProduct(product) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  return res.json();
}

async function updateProduct(id, product) {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  return res.json();
}

async function deleteProduct(id) {
  await fetch(`/api/products/${id}`, { method: 'DELETE' });
}

function renderProducts(products) {
  const list = document.getElementById('admin-products-list');
  list.innerHTML = products.map(p => `
    <div class="admin-prod-card">
      <img src="${p.image}" class="admin-prod-img">
      <input type="text" value="${p.name}" class="edit-name" data-id="${p._id}">
      <input type="number" value="${p.price}" class="edit-price" data-id="${p._id}">
      <input type="number" value="${p.stock}" class="edit-stock" data-id="${p._id}">
      <button class="save-prod-btn" data-id="${p._id}">Save</button>
      <button class="delete-prod-btn" data-id="${p._id}">Delete</button>
    </div>
  `).join('');
}

async function setupAdminProducts() {
  let products = await fetchProducts();
  renderProducts(products);

  document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const product = {
      name: document.getElementById('prod-name').value,
      description: document.getElementById('prod-desc').value,
      price: Number(document.getElementById('prod-price').value),
      image: document.getElementById('prod-image').value,
      stock: Number(document.getElementById('prod-stock').value)
    };
    await addProduct(product);
    products = await fetchProducts();
    renderProducts(products);
    document.getElementById('prod-status').textContent = 'Product added!';
    setTimeout(() => document.getElementById('prod-status').textContent = '', 1500);
    e.target.reset();
  });

  document.getElementById('admin-products-list').addEventListener('click', async e => {
    if (e.target.classList.contains('delete-prod-btn')) {
      await deleteProduct(e.target.dataset.id);
      products = await fetchProducts();
      renderProducts(products);
    }
    if (e.target.classList.contains('save-prod-btn')) {
      const id = e.target.dataset.id;
      const name = document.querySelector(`.edit-name[data-id="${id}"]`).value;
      const price = Number(document.querySelector(`.edit-price[data-id="${id}"]`).value);
      const stock = Number(document.querySelector(`.edit-stock[data-id="${id}"]`).value);
      await updateProduct(id, { name, price, stock });
      products = await fetchProducts();
      renderProducts(products);
    }
  });
}

setupAdminProducts();
