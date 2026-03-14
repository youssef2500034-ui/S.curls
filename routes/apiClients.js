const express = require('express');
const { asyncHandler, getAuth } = require('./utils');
const { list, getOne, remove } = require('../controllers/clientsController');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return list(req, res);
}));

router.get('/:mobile', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return getOne(req, res);
}));

router.delete('/:mobile', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return remove(req, res);
}));

module.exports = router;
