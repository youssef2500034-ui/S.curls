// --- Monthly Attendance Reset ---
const cron = require('node-cron');
const { Attendance } = require('./models/mydataschema');

// Run at midnight on the 1st of every month
cron.schedule('0 0 1 * *', async () => {
	try {
		await Attendance.updateMany({ archived: false }, { $set: { archived: true } });
		console.log('Attendance archived for new month');
	} catch (err) {
		console.error('Attendance archive failed:', err);
	}
});
require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { Stylist, Pricing, Gallery, Booking, Article } = require('./models/mydataschema');
const { asyncHandler } = require('./routes/utils');

const app = express();
const PORT = process.env.PORT || 3001;
const VIEWS_DIR = path.join(__dirname, 'views');
const MONGO_URI = process.env.MONGO_URI;
const SEED_DEFAULTS = process.env.SEED_DEFAULTS === 'true';
if (!MONGO_URI) {
	console.error('MONGO_URI is required in .env');
	if (require.main === module) process.exit(1);
}
// Live reload (auto-refresh) with safe fallbacks
const LIVE_RELOAD_ENABLED = process.env.LIVE_RELOAD !== 'false';
if (LIVE_RELOAD_ENABLED) {
	try {
		const livereload = require('livereload');
		const connectLivereload = require('connect-livereload');
		const lrServer = livereload.createServer({ port: 0 }); // 0 lets OS pick a free port
		let lrActive = true;
		lrServer.server.on('error', (err) => {
			lrActive = false;
			console.warn(`Live reload disabled: ${err.message}`);
		});
		lrServer.watch([path.join(__dirname, 'public'), path.join(__dirname, 'views')]);
		lrServer.server.once('listening', () => {
			if (!lrActive) return;
			const port = lrServer.server.address().port;
			app.use(connectLivereload({ port }));
			console.log(`Live reload running on port ${port}`);
		});
		lrServer.server.once('connection', () => {
			if (!lrActive) return;
			setTimeout(() => lrServer.refresh('/'), 100);
		});
	} catch (err) {
		console.warn(`Live reload not started: ${err.message}`);
	}
}
// EJS setup (render .ejs views in /views)
app.set('views', VIEWS_DIR);
app.set('view engine', 'ejs');

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pic', express.static(path.join(__dirname, 'pic')));

// Redirect any .html request to the extensionless route so we always render EJS
app.use((req, res, next) => {
	if (req.path.toLowerCase().endsWith('.html')) {
		const cleanPath = req.path.slice(0, -5) || '/';
		return res.redirect(cleanPath);
	}
	next();
});

// Page routes
const pageRouter = require('./routes/allRoutes');
app.use('/', pageRouter);

// API routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/stylist-auth', require('./routes/stylistAuthRoutes'));
app.use('/api/stylists', require('./routes/apiStylists'));
app.use('/api/pricing', require('./routes/apiPricing'));
app.use('/api/gallery', require('./routes/apiGallery'));
app.use('/api/bookings', require('./routes/apiBookings'));
app.use('/api/availability', require('./routes/apiAvailability'));
app.use('/api/employees', require('./routes/apiEmployees'));
app.use('/api/attendance', require('./routes/apiAttendance'));

const apiProducts = require('./routes/apiProducts');
const apiCart = require('./routes/apiCart');

app.use('/api/products', apiProducts);
app.use('/api/cart', apiCart);

app.get('/shop', (req, res) => {
  res.render('shop');
});

app.get('/api/health', (_req, res) => {
	res.json({ ok: true, uptime: process.uptime() });
});

app.get('/admin-products', (req, res) => {
  res.render('admin-products');
});

app.use((err, _req, res, _next) => {
	console.error('Unhandled error', err);
	res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
	mongoose
		.connect(MONGO_URI)
		.then(async () => {
			if (SEED_DEFAULTS) {
				await seedDefaults();
			}
			app.listen(PORT, () => {
				console.log(`S.curls running on http://localhost:${PORT}`);
				console.log('MongoDB connected');
			});
		})
		.catch((err) => {
			console.error('MongoDB connection error:', err);
		});
}

module.exports = app;

async function seedDefaults() {
	const stylistCount = await Stylist.countDocuments();
	const pricingCount = await Pricing.countDocuments();
	const bookingCount = await Booking.countDocuments();
	if (stylistCount === 0) {
		await Stylist.insertMany([
			{ name: 'sara', branch: 'rehab', title: 'Senior Stylist', times: ['09:00', '11:00', '15:00'] },
			{ name: 'mona', branch: 'rehab', title: 'Color Specialist', times: ['10:00', '11:00', '12:00', '13:00'] },
			{ name: 'ahmed', branch: 'sheikh-zayed', title: 'Barber', times: ['15:00', '16:00', '17:00'] },
		]);
		console.log('Seeded default stylists');
	}

	if (pricingCount === 0) {
		await Pricing.insertMany([
			{ title: 'Treatment', category: 'treatment', amount: 900, duration: 90 },
			{ title: 'Cutting', category: 'cutting', amount: 600, duration: 60 },
			{ title: 'Styling', category: 'styling', amount: 450, duration: 45 },
		]);
		console.log('Seeded default pricing');
	}

	if (bookingCount === 0) {
		await Booking.insertMany([
			{ branch: 'rehab', stylist: 'sara', service: 'cutting', date: '2026-12-01', time: '11:00', duration: 60, mobile: '01000000000', status: 'Pending' },
			{ branch: 'sheikh-zayed', stylist: 'ahmed', service: 'styling', date: '2026-12-02', time: '15:00', duration: 45, mobile: '01100000000', status: 'Pending' },
		]);
		console.log('Seeded sample bookings');
	}
}