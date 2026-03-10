// Fetch products and render shop grid
async function fetchProducts() {
  const res = await fetch('/api/products');
  return res.json();
}

function renderProducts(products) {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = products.map(product => `
    <div class="shop-card">
      <img src="${product.image}" alt="${product.name}" class="shop-img">
      <h3>${product.name}</h3>
      <p class="shop-desc">${product.description}</p>
      <span class="shop-price">$${product.price}</span>
      <button class="add-cart-btn" data-id="${product._id}">Add to Cart</button>
    </div>
  `).join('');
}

// Cart logic
let cart = {};

function renderCart() {
  const cartItems = document.getElementById('cart-items');
  const subtotal = Object.values(cart).reduce((sum, item) => sum + item.price * item.qty, 0);
  cartItems.innerHTML = Object.values(cart).map(item => `
    <li>
      <img src="${item.image}" class="cart-img">
      <span>${item.name}</span>
      <span>$${item.price} x ${item.qty}</span>
      <button class="remove-cart-btn" data-id="${item._id}">Remove</button>
    </li>
  `).join('');
  document.getElementById('cart-subtotal').textContent = `Subtotal: $${subtotal}`;
}

function addToCart(product) {
  if (!cart[product._id]) {
    cart[product._id] = { ...product, qty: 1 };
  } else {
    cart[product._id].qty += 1;
  }
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  renderCart();
}

// Event listeners
async function setupShop() {
  const products = await fetchProducts();
  renderProducts(products);
  document.getElementById('shop-grid').addEventListener('click', e => {
    if (e.target.classList.contains('add-cart-btn')) {
      const id = e.target.dataset.id;
      const product = products.find(p => p._id === id);
      addToCart(product);
    }
  });
  document.getElementById('cart-items').addEventListener('click', e => {
    if (e.target.classList.contains('remove-cart-btn')) {
      const id = e.target.dataset.id;
      removeFromCart(id);
    }
  });
  document.getElementById('checkout-btn').addEventListener('click', () => {
    alert('Checkout not implemented.');
  });
}

setupShop();
