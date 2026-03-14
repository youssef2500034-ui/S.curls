const { Order, Product, Client } = require('../models/mydataschema');
const { makeId } = require('../routes/utils');

function normalizePayment(method = 'cash') {
  const m = (method || '').toLowerCase();
  if (['cash', 'card', 'instapay'].includes(m)) return m;
  return 'cash';
}

async function list(req, res) {
  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(200);
  res.json(orders.map((o) => o.toJSON()));
}

async function getOne(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order.toJSON());
}

async function create(req, res) {
  const { items = [], clientMobile = '', paymentMethod = 'cash', shippingAddress = '', email = '', name = '' } = req.body || {};
  if (!clientMobile || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'clientMobile and at least one item are required' });
  }
  if (!/^\+?\d{9,15}$/.test(clientMobile.replace(/\s+/g, ''))) {
    return res.status(400).json({ error: 'Invalid mobile number' });
  }
  if (!shippingAddress.trim()) {
    return res.status(400).json({ error: 'Shipping address required' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Load products and validate stock
  const productIds = items.map((i) => i.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = products.reduce((acc, p) => { acc[p._id] = p; return acc; }, {});

  const orderItems = [];
  let subtotal = 0;
  for (const item of items) {
    const prod = productMap[item.productId];
    if (!prod) return res.status(400).json({ error: `Product not found: ${item.productId}` });
    const qty = Number(item.qty) || 1;
    if (qty <= 0) return res.status(400).json({ error: `Quantity must be at least 1 for ${prod.name}` });
    if (prod.stock < qty) return res.status(409).json({ error: `Insufficient stock for ${prod.name}` });
    orderItems.push({
      productId: prod._id,
      name: prod.name,
      price: prod.price,
      qty,
      image: prod.image || '',
    });
    subtotal += prod.price * qty;
  }

  // Reserve stock
  for (const item of orderItems) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: -item.qty } });
  }

  const order = await Order.create({
    _id: makeId('ord'),
    clientMobile,
    items: orderItems,
    subtotal,
    paymentMethod: normalizePayment(paymentMethod),
    status: 'pending',
    shippingAddress: shippingAddress || '',
  });

  await Client.findOneAndUpdate(
    { mobile: clientMobile },
    { $setOnInsert: { _id: makeId('cli'), mobile: clientMobile, name, email }, $set: { lastContactAt: new Date(), name, email } },
    { upsert: true, returnDocument: 'after' }
  );

  res.status(201).json(order.toJSON());
}

async function updateStatus(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  const { status, paymentMethod } = req.body || {};
  if (status) order.status = status;
  if (paymentMethod) order.paymentMethod = normalizePayment(paymentMethod);
  await order.save();
  res.json(order.toJSON());
}

module.exports = { list, getOne, create, updateStatus };
