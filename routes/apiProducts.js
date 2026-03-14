const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const { Product } = require('../models/mydataschema');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '').slice(-50) || 'image';
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

function toAbsoluteUrl(req, url = '') {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = `${req.protocol}://${req.get('host')}`;
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return `${base}${normalized}`;
}

// Get all products
router.get('/', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products.map((p) => {
    const json = p.toJSON();
    json.image = toAbsoluteUrl(req, json.image);
    return json;
  }));
});

// Get product by id
router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  const json = product.toJSON();
  json.image = toAbsoluteUrl(req, json.image);
  res.json(json);
});

function normalizeProduct(body) {
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (!body.name) throw new Error('Name is required');
  if (Number.isNaN(price) || price < 0) throw new Error('Price must be a positive number');
  if (Number.isNaN(stock) || stock < 0) throw new Error('Stock must be zero or more');
  return {
    name: (body.name || '').trim(),
    description: (body.description || '').trim(),
    price,
    image: (body.image || '').trim(),
    brand: (body.brand || '').trim(),
    category: (body.category || 'general').toLowerCase(),
    stock,
  };
}

// Add product
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const payload = normalizeProduct({ ...req.body, ...(fileUrl ? { image: fileUrl } : {}) });
    const product = await Product.create(payload);
    const json = product.toJSON();
    json.image = toAbsoluteUrl(req, json.image);
    res.status(201).json(json);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid product' });
  }
});

// Update product
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const merged = { ...existing.toObject(), ...req.body };
    if (fileUrl) merged.image = fileUrl;
    // If no image provided and no file, keep existing image
    if (!merged.image) merged.image = existing.image;
    const payload = normalizeProduct(merged);
    existing.set(payload);
    await existing.save();
    const json = existing.toJSON();
    json.image = toAbsoluteUrl(req, json.image);
    res.json(json);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
