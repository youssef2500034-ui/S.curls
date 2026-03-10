const express = require('express');
const { asyncHandler, getAuth } = require('./utils');
const { list, create, update, remove, restoreMonth } = require('../controllers/attendanceController');

const router = express.Router();

router.use(async (req, res, next) => {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  req.user = auth;
  next();
});


router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.put('/:id', asyncHandler(update));
router.delete('/:id', asyncHandler(remove));

// Restore archived records for a month (admin only)
router.post('/restore-month', asyncHandler(restoreMonth));

module.exports = router;
