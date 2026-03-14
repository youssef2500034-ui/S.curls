const express = require('express');
const router = express.Router();

// Simple session-aware cart (per ip + user-agent fallback) for demo purposes
const carts = new Map();

function cartKey(req) {
  const ua = req.get('user-agent') || '';
  const ip = req.ip || req.connection?.remoteAddress || 'local';
  return `${ip}-${ua.slice(0, 16)}`;
}

function getCart(req) {
  const key = cartKey(req);
  if (!carts.has(key)) carts.set(key, {});
  return carts.get(key);
}

router.get('/', (req, res) => {
  res.json(getCart(req));
});

router.post('/add', (req, res) => {
  const { product, qty = 1 } = req.body || {};
  if (!product || !product._id) return res.status(400).json({ error: 'Product required' });
  const cart = getCart(req);
  if (!cart[product._id]) {
    cart[product._id] = { ...product, qty: Number(qty) || 1 };
  } else {
    cart[product._id].qty += Number(qty) || 1;
  }
  res.json(cart);
});

router.post('/remove', (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  const cart = getCart(req);
  delete cart[id];
  res.json(cart);
});

router.post('/clear', (req, res) => {
  const key = cartKey(req);
  carts.set(key, {});
  res.json({});
});

module.exports = router;
