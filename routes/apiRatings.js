const express = require('express');
const { asyncHandler } = require('./utils');
const { addRating, listRatings, stats, listTestimonials, updateTestimonial, deleteTestimonial } = require('../controllers/ratingsController');

const router = express.Router();

router.get('/ratings', asyncHandler(listRatings));
router.get('/ratings/stats', asyncHandler(stats));
router.post('/ratings', asyncHandler(addRating));
router.get('/testimonials', asyncHandler(listTestimonials));
router.put('/testimonials/:id', asyncHandler(updateTestimonial));
router.delete('/testimonials/:id', asyncHandler(deleteTestimonial));

module.exports = router;
