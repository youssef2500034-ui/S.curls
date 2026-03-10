const express = require('express');
const { Stylist, Pricing, Gallery } = require('../models/mydataschema');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Home with data
router.get('/', asyncHandler(async (_req, res) => {
	const stylists = await Stylist.find();
	const pricing = await Pricing.find();
	const gallery = await Gallery.find();
	res.render('index', { stylists, pricing, gallery, active: 'home' });
}));

router.get('/index', (_req, res) => res.redirect('/'));

// Simple EJS pages
const pageRoutes = {
	'/gallery': { view: 'gallery', active: 'gallery' },
	'/pricing': { view: 'pricing', active: 'pricing' },
	'/staff': { view: 'staff', active: 'staff' },
	'/booking': { view: 'booking', active: 'booking' },
	'/manage-booking': { view: 'manage-booking', active: 'manage-booking' },
	'/admin-login': { view: 'admin-login', active: 'admin-login' },
	'/admin': { view: 'admin', active: 'admin' },
	'/stylist-portal': { view: 'stylist-portal', active: 'stylist-portal' },
	'/contact': { view: 'contact', active: 'contact' },
	'/testimonials': { view: 'testimonials', active: 'testimonials' },
	'/our-branches': { view: 'Our Branches', active: 'our-branches' },
};

Object.entries(pageRoutes).forEach(([route, config]) => {
	router.get(route, (_req, res) => res.render(config.view, { active: config.active }));
});

module.exports = router;