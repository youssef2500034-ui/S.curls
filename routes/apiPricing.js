const express = require('express');
const { asyncHandler, authRequired } = require('./utils');
const { list, create, update, remove } = require('../controllers/pricingController');

const router = express.Router();

router.get('/', asyncHandler(list));
router.post('/', authRequired, asyncHandler(create));
router.put('/:id', authRequired, asyncHandler(update));
router.delete('/:id', authRequired, asyncHandler(remove));

module.exports = router;
