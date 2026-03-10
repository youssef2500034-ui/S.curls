const { Employee } = require('../models/mydataschema');

function normalize(payload, id = null) {
  return {
    _id: id || payload._id || payload.id,
    name: (payload.name || '').trim(),
    role: (payload.role || 'Staff').trim(),
    branch: (payload.branch || 'rehab').toLowerCase().trim(),
    status: payload.status || 'active',
    baseSalary: Number(payload.baseSalary) || 0,
    hourlyRate: Number(payload.hourlyRate) || 0,
    startDate: (payload.startDate || '').trim(),
    notes: (payload.notes || '').trim(),
    loginPhone: (payload.loginPhone || payload.phone || '').trim(),
    loginPin: (payload.loginPin || '').trim(),
  };
}

async function list(_req, res) {
  const records = await Employee.find({});
  res.json(records.map((r) => r.toJSON()));
}

async function create(req, res) {
  const record = normalize(req.body || {});
  const saved = await Employee.create(record);

  // Also create a stylist entry for this employee
  const { Stylist } = require('../models/mydataschema');
  const stylistPayload = {
    name: record.name,
    branch: record.branch,
    title: record.role,
    specialties: [],
    times: [],
    bio: record.notes,
    phone: record.loginPhone,
    visible: true,
  };
  await Stylist.create(stylistPayload);

  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Employee.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  existing.set(normalize({ ...existing.toObject(), ...req.body }, id));
  await existing.save();
  res.json(existing.toJSON());
}

async function remove(req, res) {
  const id = req.params.id;
  const existing = await Employee.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await existing.deleteOne();
  res.status(204).end();
}

module.exports = { list, create, update, remove };
