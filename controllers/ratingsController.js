const { Rating, Testimonial, Booking } = require('../models/mydataschema');
const { makeId, getAuth } = require('../routes/utils');

function isPastVisit(booking) {
  if (!booking?.date) return false;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  if (booking.date < todayStr) return true;
  if (booking.date > todayStr) return false;
  if (!booking.time) return false;
  const [h, m = 0] = booking.time.split(':').map((n) => Number(n) || 0);
  const visitMinutes = h * 60 + m;
  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  return visitMinutes <= nowMinutes;
}

async function addRating(req, res) {
  const { bookingId, stylist, mobile, score, comment } = req.body || {};
  if (!mobile || !score) {
    return res.status(400).json({ error: 'mobile and score are required' });
  }

  const mobileClean = mobile.trim();
  const stylistClean = (stylist || '').trim().toLowerCase();
  let booking = null;

  if (bookingId) {
    booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.mobile !== mobileClean) return res.status(400).json({ error: 'Mobile does not match booking' });
  } else {
    const history = await Booking.find({ mobile: mobileClean, status: { $ne: 'Cancelled' } }).sort({ date: -1, time: -1 });
    booking = history.find((b) => isPastVisit(b));
    if (!booking) return res.status(404).json({ error: 'No past booking found for this mobile' });
  }

  if (!isPastVisit(booking)) {
    return res.status(409).json({ error: 'You can rate after the visit time.' });
  }

  const existingRating = await Rating.findOne({ bookingId: booking._id });
  if (existingRating) {
    return res.status(409).json({ error: 'This visit is already rated.' });
  }

  const payload = {
    _id: makeId('rat'),
    bookingId: booking._id,
    stylist: stylistClean || (booking.stylist || '').toLowerCase(),
    clientMobile: mobileClean,
    score: Number(score),
    comment: (comment || '').trim(),
  };

  const saved = await Rating.create(payload);

  // Also store a testimonial-friendly entry
  await Testimonial.create({
    _id: makeId('tes'),
    name: booking.name || 'Client',
    service: booking.service,
    comment: payload.comment || 'Rated the visit',
    rating: payload.score,
    stylist: booking.stylist,
    verified: true,
  });

  res.status(201).json(saved.toJSON());
}

async function listRatings(req, res) {
  const stylist = (req.query.stylist || '').toLowerCase();
  const query = stylist ? { stylist } : {};
  const ratings = await Rating.find(query).sort({ createdAt: -1 }).limit(100);
  res.json(ratings.map((r) => r.toJSON()));
}

async function stats(req, res) {
  const stylist = (req.query.stylist || '').toLowerCase();
  const pipeline = [
    ...(stylist ? [{ $match: { stylist } }] : []),
    { $group: { _id: '$stylist', avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ];
  const result = await Rating.aggregate(pipeline);
  res.json(result);
}

async function listTestimonials(_req, res) {
  const testimonials = await Testimonial.find({}).sort({ createdAt: -1 }).limit(50);
  res.json(testimonials.map((t) => t.toJSON()));
}

async function updateTestimonial(req, res) {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const { name, service, comment, rating, stylist } = req.body || {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (service !== undefined) updates.service = service;
  if (comment !== undefined) updates.comment = comment;
  if (rating !== undefined) updates.rating = rating;
  if (stylist !== undefined) updates.stylist = stylist;
  const updated = await Testimonial.findByIdAndUpdate(id, updates, { new: true });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated.toJSON());
}

async function deleteTestimonial(req, res) {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.params;
  const deleted = await Testimonial.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
}

module.exports = { addRating, listRatings, stats, listTestimonials, updateTestimonial, deleteTestimonial };
