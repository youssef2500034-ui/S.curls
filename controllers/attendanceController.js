const { Attendance } = require('../models/mydataschema');

function calcHours(checkIn, checkOut, rawHours) {
  const direct = Number(rawHours) || 0;
  if (direct > 0) return direct;
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  if (Number.isNaN(inH) || Number.isNaN(outH)) return 0;
  const diffMinutes = (outH * 60 + (outM || 0)) - (inH * 60 + (inM || 0));
  if (diffMinutes <= 0) return 0;
  return Math.round((diffMinutes / 60) * 100) / 100;
}

function normalize(payload, id = null) {
  const checkIn = (payload.checkIn || '').trim();
  const checkOut = (payload.checkOut || '').trim();
  const hours = calcHours(checkIn, checkOut, payload.hours);

  return {
    _id: id || payload._id || payload.id,
    employeeId: (payload.employeeId || '').trim(),
    date: (payload.date || '').trim(),
    checkIn,
    checkOut,
    hours,
    notes: (payload.notes || '').trim(),
  };
}

async function list(req, res) {
  const { employeeId, month, year, showArchived } = req.query;
  let query = {};
  if (employeeId) query.employeeId = employeeId;
  if (month && year) {
    // date format assumed YYYY-MM-DD
    const monthStr = String(month).padStart(2, '0');
    query.date = { $regex: `^${year}-${monthStr}` };
  }
  if (!showArchived) {
    query.archived = false;
  }
  const records = await Attendance.find(query);
  res.json(records.map((r) => r.toJSON()));
}

// Restore all records for a given month/year
async function restoreMonth(req, res) {
  const { month, year } = req.body;
  if (!month || !year) return res.status(400).json({ error: 'Month and year required' });
  const monthStr = String(month).padStart(2, '0');
  const result = await Attendance.updateMany(
    { date: { $regex: `^${year}-${monthStr}` }, archived: true },
    { $set: { archived: false } }
  );
  res.json({ restored: result.modifiedCount });
}
async function create(req, res) {
  const record = normalize(req.body || {});
  if (req.user?.meta?.role === 'stylist') {
    record.employeeId = req.user.meta.employeeId;
  }
  const saved = await Attendance.create(record);
  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Attendance.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const merged = normalize({ ...existing.toObject(), ...req.body }, id);
  if (req.user?.meta?.role === 'stylist') {
    merged.employeeId = req.user.meta.employeeId;
  }
  existing.set(merged);
  await existing.save();
  res.json(existing.toJSON());
}

async function remove(req, res) {
  const id = req.params.id;
  const existing = await Attendance.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await existing.deleteOne();
  res.status(204).end();
}

module.exports = { list, create, update, remove, restoreMonth };
