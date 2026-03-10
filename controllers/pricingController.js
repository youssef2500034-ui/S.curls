const { Pricing } = require('../models/mydataschema');
const { makeId, cleanArray } = require('../routes/utils');

function normalizePricing(payload, id = null) {
  const baseId = id || payload._id || payload.id || makeId('price');
  return {
    _id: baseId,
    id: baseId,
    title: (payload.title || 'Service').trim(),
    category: (payload.category || 'cutting').toLowerCase(),
    amount: Number(payload.amount) || 0,
    duration: Number(payload.duration) || 0,
    features: cleanArray(payload.features).map((f) => f.trim()).filter(Boolean),
  };
}

async function list(req, res) {
  const list = await Pricing.find();
  res.json(list.map((doc) => doc.toJSON()));
}

async function create(req, res) {
  const record = normalizePricing(req.body || {});
  const saved = await Pricing.create(record);
  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Pricing.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  existing.set(normalizePricing({ ...existing.toObject(), ...req.body }, id));
  await existing.save();
  res.json(existing.toJSON());
}

async function remove(req, res) {
  const id = req.params.id;
  const deleted = await Pricing.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}

module.exports = { list, create, update, remove };
