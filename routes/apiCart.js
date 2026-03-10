const express = require('express');
const router = express.Router();

// Simple in-memory cart for demo
let cart = {};

// Get cart
router.get('/', (req, res) => {
  res.json(cart);
});

// Add item to cart
router.post('/add', (req, res) => {
  const { product } = req.body;
  if (!cart[product._id]) {
    cart[product._id] = { ...product, qty: 1 };
  } else {
    cart[product._id].qty += 1;
  }
  res.json(cart);
});

// Remove item from cart
router.post('/remove', (req, res) => {
  const { id } = req.body;
  delete cart[id];
  res.json(cart);
});

// Clear cart
router.post('/clear', (req, res) => {
  cart = {};
  res.json(cart);
});

module.exports = router;
