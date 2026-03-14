const https = require('https');
const { Booking, Client, Pricing, Stylist, Rating } = require('../models/mydataschema');
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

async function resolveDuration(service) {
  const pricing = await Pricing.findOne({ category: (service || '').toLowerCase() });
  return pricing?.duration || 60;
}

function normalizePaymentMethod(method = 'none') {
  const normalized = (method || 'none').toLowerCase();
  if (['cash', 'card', 'instapay'].includes(normalized)) return normalized;
  return 'none';
}

function isPastVisit(booking) {
  if (!booking?.date) return false;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (booking.date < todayStr) return true;
  if (booking.date > todayStr) return false;
  // same day: check time has passed
  if (!booking.time) return false;
  const [h, m = 0] = booking.time.split(':').map((n) => Number(n) || 0);
  const visitMinutes = h * 60 + m;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  return visitMinutes <= nowMinutes;
}

function isFutureOrOngoing(booking) {
  if (!booking?.date) return false;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (booking.date > todayStr) return true;
  if (booking.date < todayStr) return false;
  // same day: in the future relative to now
  if (!booking.time) return true;
  const [h, m = 0] = booking.time.split(':').map((n) => Number(n) || 0);
  const visitMinutes = h * 60 + m;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  return visitMinutes > nowMinutes;
}

async function normalizeBooking(payload, id = null) {
  const baseId = id || payload._id || payload.id || makeId('book');
  const duration = Number(payload.duration) || await resolveDuration(payload.service);
  return {
    _id: baseId,
    id: baseId,
    branch: (payload.branch || '').toLowerCase().trim(),
    stylist: (payload.stylist || '').toLowerCase().trim(),
    service: (payload.service || '').trim(),
    date: (payload.date || '').trim(),
    time: (payload.time || '').trim(),
    duration,
    mobile: (payload.mobile || '').trim(),
    name: (payload.name || '').trim(),
    email: (payload.email || '').trim(),
    status: payload.status || 'Pending',
    paymentStatus: payload.paymentStatus || 'Unpaid',
    paymentMethod: normalizePaymentMethod(payload.paymentMethod),
    notes: (payload.notes || '').trim(),
  };
}

function toMinutes(timeString = '') {
  const [h, m] = timeString.split(':').map((n) => Number(n) || 0);
  return h * 60 + m;
}

function overlaps(startA, durA, startB, durB) {
  const endA = startA + durA;
  const endB = startB + durB;
  return !(endA <= startB || startA >= endB);
}

async function validateSlot(record) {
  const stylist = await Stylist.findOne({ name: new RegExp(`^${record.stylist}$`, 'i') });
  if (!stylist) return { ok: false, error: 'Stylist not found' };
  const schedule = Array.isArray(stylist.times) ? stylist.times : [];
  if (!schedule.includes(record.time)) return { ok: false, error: 'Selected time not in stylist schedule' };

  const sameDay = await Booking.find({
    branch: record.branch,
    stylist: record.stylist,
    date: record.date,
    status: { $ne: 'Cancelled' },
  });

  const startMinutes = toMinutes(record.time);
  const hasOverlap = sameDay.some((b) => overlaps(startMinutes, record.duration, toMinutes(b.time), Number(b.duration) || 60));
  if (hasOverlap) return { ok: false, error: 'This stylist is already booked for this slot.' };

  return { ok: true };
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
  const record = await normalizeBooking(req.body || {});

  // Disallow duplicate booking for same mobile at same branch/date/time if not cancelled
  if (record.mobile && record.date && record.time) {
    const dup = await Booking.findOne({
      mobile: record.mobile,
      branch: record.branch,
      date: record.date,
      time: record.time,
      status: { $in: ['Pending', 'Confirmed'] },
    });
    if (dup) {
      return res.status(409).json({
        error: 'Duplicate booking for the same time detected.',
        bookingId: dup._id,
      });
    }
  }

  // Block duplicate active bookings for same mobile (pending/confirmed today or future)
  if (record.mobile) {
    const active = await Booking.find({
      mobile: record.mobile,
      status: { $in: ['Pending', 'Confirmed'] },
      paymentStatus: { $ne: 'Paid' },
    }).sort({ date: -1, time: -1 });
    const blocking = active.find((b) => isFutureOrOngoing(b));
    if (blocking) {
      return res.status(409).json({
        error: 'You already have an active booking. Please manage or complete it before booking again.',
        bookingId: blocking._id,
        activeDate: blocking.date,
        activeTime: blocking.time,
        activeStatus: blocking.status,
      });
    }
  }

  // Require rating on the latest completed visit before allowing another booking
  if (record.mobile) {
    const history = await Booking.find({ mobile: record.mobile, status: { $ne: 'Cancelled' } }).sort({ date: -1, time: -1 });
    const lastPastVisit = history.find((b) => isPastVisit(b));
    if (lastPastVisit) {
      const hasRating = await Rating.findOne({ bookingId: lastPastVisit._id });
      if (!hasRating) {
        return res.status(409).json({ error: 'Please rate your last visit before booking again.', bookingId: lastPastVisit._id });
      }
    }
  }

  const slotCheck = await validateSlot(record);
  if (!slotCheck.ok) return res.status(409).json({ error: slotCheck.error });

  // Ensure client exists and update history
  const clientUpdate = {
    name: (req.body.name || '').trim(),
    email: (req.body.email || '').trim(),
    preferredBranch: record.branch,
    preferredStylist: record.stylist,
    lastVisitDate: record.date,
  };
  const client = await Client.findOneAndUpdate(
    { mobile: record.mobile },
    {
      $setOnInsert: { _id: makeId('cli'), mobile: record.mobile },
      $set: clientUpdate,
      $inc: { visitCount: 1 },
    },
    { upsert: true, returnDocument: 'after' }
  );

  record.client = client._id;

  const saved = await Booking.create(record);
  await Client.updateOne(
    { _id: client._id },
    { $push: { bookingHistory: saved._id }, $set: { lastVisitDate: record.date } }
  );

  const existingCount = await Booking.countDocuments({ mobile: record.mobile });

  const payload = { ...saved.toJSON(), event: 'booking.created', firstTimeCustomer: existingCount === 0 };
  sendToN8n(N8N_BOOKING_CREATED_URL, payload);

  res.status(201).json(saved.toJSON());
}

async function update(req, res) {
  const id = req.params.id;
  const existing = await Booking.findById(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const previousStatus = existing.status;
  const updatedPayload = await normalizeBooking({ ...existing.toObject(), ...req.body }, id);

  const isTimingChange =
    updatedPayload.time !== existing.time ||
    updatedPayload.stylist !== existing.stylist ||
    updatedPayload.branch !== existing.branch;

  if (isTimingChange) {
    const slotCheck = await validateSlot(updatedPayload);
    if (!slotCheck.ok) return res.status(409).json({ error: slotCheck.error });
  }
  existing.set(updatedPayload);
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
