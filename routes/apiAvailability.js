const express = require('express');
const { asyncHandler } = require('./utils');
const { Stylist, Pricing, Booking } = require('../models/mydataschema');

const router = express.Router();

function toMinutes(timeString = '') {
  const [h, m] = timeString.split(':').map((n) => Number(n) || 0);
  return h * 60 + m;
}

function overlaps(startA, durA, startB, durB) {
  const endA = startA + durA;
  const endB = startB + durB;
  return !(endA <= startB || startA >= endB);
}

router.get('/', asyncHandler(async (req, res) => {
  const date = (req.query.date || new Date().toISOString().split('T')[0]).trim();

  const [stylists, pricing, bookings] = await Promise.all([
    Stylist.find({}),
    Pricing.find({}),
    Booking.find({ date, status: { $ne: 'Cancelled' } }),
  ]);

  const durationMap = pricing.reduce((acc, p) => {
    const key = (p.category || '').toLowerCase();
    if (key) acc[key] = p.duration || 60;
    return acc;
  }, {});

  const slots = [];

  stylists.forEach((sty) => {
    const branch = (sty.branch || '').toLowerCase();
    const stylistKey = (sty.name || '').toLowerCase();
    const times = Array.isArray(sty.times) ? sty.times : [];

    times.forEach((time) => {
      const start = toMinutes(time);
      const hasConflict = bookings.some((b) => {
        if ((b.branch || '').toLowerCase() !== branch) return false;
        if ((b.stylist || '').toLowerCase() !== stylistKey) return false;
        const dur = Number(b.duration) || durationMap[(b.service || '').toLowerCase()] || 60;
        return overlaps(start, dur, toMinutes(b.time), dur);
      });

      if (!hasConflict) {
        slots.push({
          branch,
          stylist: stylistKey,
          displayName: sty.name || stylistKey,
          time,
        });
      }
    });
  });

  res.json({ date, slots });
}));

module.exports = router;