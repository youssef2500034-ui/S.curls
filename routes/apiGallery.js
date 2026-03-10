const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { asyncHandler, authRequired } = require('./utils');
const { list, create, update, remove } = require('../controllers/galleryController');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadDir),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname) || '.jpg';
		const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '').slice(-50) || 'image';
		cb(null, `${Date.now()}-${base}${ext}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype.startsWith('image/')) {
			return cb(new Error('Only image uploads are allowed'));
		}
		cb(null, true);
	},
});

router.get('/', asyncHandler(list));
router.post('/', authRequired, upload.single('image'), asyncHandler(create));
router.put('/:id', authRequired, upload.single('image'), asyncHandler(update));
router.delete('/:id', authRequired, asyncHandler(remove));

module.exports = router;
