const express = require('express');
const { asyncHandler, getAuth } = require('./utils');
const { listMessages, sendMessage } = require('../controllers/messagesController');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return listMessages(req, res);
}));

router.post('/', asyncHandler(async (req, res) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  return sendMessage(req, res);
}));

module.exports = router;
