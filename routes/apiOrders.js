const express = require('express');
const { asyncHandler, getAuth } = require('./utils');
const { list, getOne, create, updateStatus } = require('../controllers/ordersController');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return list(req, res);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return getOne(req, res);
}));

router.post('/', asyncHandler(create));

router.put('/:id', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return updateStatus(req, res);
}));

module.exports = router;
