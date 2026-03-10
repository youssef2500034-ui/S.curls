const express = require('express');
const { asyncHandler } = require('./utils');
const { login } = require('../controllers/stylistAuthController');

const router = express.Router();

router.post('/login', asyncHandler(login));

module.exports = router;
