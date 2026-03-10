const https = require('https');
const { Booking } = require('../models/mydataschema');
const { makeId } = require('../routes/utils');

const {
  N8N_BOOKING_CREATED_URL = '',
  N8N_BOOKING_UPDATED_URL = '',
} = process.env;

function sendToN8n(url, payload) {
  if (!url) return;
  try {
    const data = JSON.stringify(payload);
    const target = new URL(url);
    const options = {
      method: 'POST',
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
    });
    req.on('error', (err) => {
      console.error('n8n webhook failed', err.message || err);
    });
    req.write(data);
    req.end();
  } catch (err) {
    console.error('n8n webhook failed', err.message || err);
  }
}

function normalizeBooking(payload, id = null) {
  const baseId = id || payload._id || payload.id || makeId('book');
  return {
    _id: baseId,
    id: baseId,
    branch: (payload.branch || '').toLowerCase().trim(),
    stylist: (payload.stylist || '').toLowerCase().trim(),
    service: (payload.service || '').trim(),
    date: (payload.date || '').trim(),
    time: (payload.time || '').trim(),
    duration: Number(payload.duration) || 60,
    mobile: (payload.mobile || '').trim(),
    status: payload.status || 'Pending',
    paymentStatus: payload.paymentStatus || 'Unpaid',
    paymentMethod: (payload.paymentMethod || 'none').toLowerCase(),
    notes: (payload.notes || '').trim(),
  };
}

async function list(req, res) {
  const { branch, stylist, status, from, to } = req.query;
  const query = {};
  if (branch) query.branch = branch.toLowerCase();
  if (stylist) query.stylist = stylist.toLowerCase();
  if (status) query.status = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = from;
    if (to) query.date.$lte = to;
  }
  const list = await Booking.find(query);
  res.json(list.map((doc) => doc.toJSON()));
}

async function search(req, res) {
  const mobile = (req.query.mobile || '').trim();
  if (!mobile) return res.status(400).json({ error: 'Mobile required' });
  const list = await Booking.find({ mobile });
  res.json(list.map((doc) => doc.toJSON()));
}

async function create(req, res) {
  const record = normalizeBooking(req.body || {});
  // Conflict check: prevent double booking
  const conflict = await Booking.findOne({
    branch: record.branch,
    stylist: record.stylist,
    date: record.date,
    time: record.time,
    status: { $ne: 'Cancelled' }
  });
  if (conflict) {
    return res.status(409).json({ error: 'This stylist is already booked for this time.' });
  }
  const existingCount = await Booking.countDocuments({ mobile: record.mobile });
  const saved = await Booking.create(record);

  const payload = { ...saved.toJSON(), event: 'booking.created', firstTimeCustomer: existingCount === 0 };
  sendToN8n(N8N_BOOKING_CREATED_URL, payload);

  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Booking.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const previousStatus = existing.status;
  existing.set(normalizeBooking({ ...existing.toObject(), ...req.body }, id));
  await existing.save();

  const payload = { ...existing.toJSON(), event: 'booking.updated', previousStatus };
  sendToN8n(N8N_BOOKING_UPDATED_URL, payload);

  res.json(existing.toJSON());
}

async function remove(req, res) {
  const id = req.params.id;
  const existing = await Booking.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await existing.deleteOne();
  res.status(204).end();
}

module.exports = { list, search, create, update, remove };
