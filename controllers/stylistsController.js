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
    name: (payload.name || 'New stylist').trim().toLowerCase(),
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
  const list = await Stylist.find().sort({ updatedAt: -1 });
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.json(list.map((doc) => doc.toJSON()));
}

async function create(req, res) {
  const record = normalizeStylist(req.body || {});
  const exists = await Stylist.findOne({ name: record.name, branch: record.branch });
  if (exists) return res.status(409).json({ error: 'Stylist already exists for this branch' });
  const saved = await Stylist.create(record);
  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Stylist.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const next = normalizeStylist({ ...existing.toObject(), ...req.body }, id);
  const dupe = await Stylist.findOne({ name: next.name, branch: next.branch, _id: { $ne: id } });
  if (dupe) return res.status(409).json({ error: 'Stylist already exists for this branch' });
  existing.set(next);
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
