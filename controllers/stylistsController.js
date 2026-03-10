const { Stylist } = require('../models/mydataschema');
const { makeId, cleanArray } = require('../routes/utils');

function normalizeStylist(payload, id = null) {
  const baseId = id || payload._id || payload.id || makeId('sty');
  const role = (payload.title || '').toLowerCase();
  let visible = payload.visible === false ? false : true;
  // Force CEO/admin always visible
  if (role.includes('ceo') || role.includes('admin')) visible = true;
  // If branch is 'both', duplicate times for both branches
  let branch = (payload.branch || 'rehab').toLowerCase();
  let times = cleanArray(payload.times);
  if (branch === 'both') {
    branch = 'rehab'; // Default branch for storage
    // Optionally, duplicate times for both branches in availability logic
  }
  return {
    _id: baseId,
    id: baseId,
    name: (payload.name || 'New stylist').trim(),
    branch,
    title: (payload.title || '').trim(),
    specialties: cleanArray(payload.specialties).map((s) => s.toLowerCase()),
    times,
    bio: (payload.bio || '').trim(),
    phone: (payload.phone || '').trim(),
    visible,
  };
}

async function list(req, res) {
  const list = await Stylist.find();
  res.json(list.map((doc) => doc.toJSON()));
}

async function create(req, res) {
  const record = normalizeStylist(req.body || {});
  const saved = await Stylist.create(record);
  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Stylist.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  existing.set(normalizeStylist({ ...existing.toObject(), ...req.body }, id));
  await existing.save();
  res.json(existing.toJSON());
}

async function remove(req, res) {
  const id = req.params.id;
  const deleted = await Stylist.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}

module.exports = { list, create, update, remove };
