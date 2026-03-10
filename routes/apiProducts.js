const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// Get all products
router.get('/', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Get product by id
router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
});

// Add product
router.post('/', async (req, res) => {
  const { name, description, price, image, stock } = req.body;
  const product = new Product({ name, description, price, image, stock });
  await product.save();
  res.json(product);
});

// Update product
router.put('/:id', async (req, res) => {
  const { name, description, price, image, stock } = req.body;
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { name, description, price, image, stock },
    { new: true }
  );
  res.json(product);
});

// Delete product
router.delete('/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
