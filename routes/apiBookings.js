const express = require('express');
const { asyncHandler, getAuth } = require('./utils');
const { list, search, create, update, remove } = require('../controllers/bookingsController');

const router = express.Router();

router.get('/', asyncHandler(async (req, res, next) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return list(req, res, next);
}));

router.get('/search', asyncHandler(search));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const auth = await getAuth(req);
  const requestMobile = (req.body?.mobile || req.query.mobile || '').trim();
  const existing = await require('../models/mydataschema').Booking.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (!auth && requestMobile !== existing.mobile) return res.status(401).json({ error: 'Unauthorized' });
  return remove(req, res, next);
}));

module.exports = router;
