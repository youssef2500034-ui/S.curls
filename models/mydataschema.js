const mongoose = require('mongoose');
const { Schema } = mongoose;

function makeId(prefix = 'rec') {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
}

function baseTransform(_doc, ret) {
	ret.id = ret.id || ret._id;
	delete ret.__v;
	return ret;
}

const stylistSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('sty') },
		name: { type: String, required: true, trim: true },
		branch: { type: String, default: 'rehab', lowercase: true, trim: true },
		title: { type: String, default: '', trim: true },
		specialties: { type: [String], default: [] },
		times: { type: [String], default: [] },
		bio: { type: String, default: '', trim: true },
		phone: { type: String, default: '', trim: true },
		visible: { type: Boolean, default: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const pricingSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('price') },
		title: { type: String, required: true, trim: true },
		category: { type: String, default: 'cutting', lowercase: true, trim: true },
		amount: { type: Number, default: 0 },
		duration: { type: Number, default: 0 },
		features: { type: [String], default: [] },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const gallerySchema = new Schema(
	{
		_id: { type: String, default: () => makeId('shot') },
		url: { type: String, default: '', trim: true },
		title: { type: String, default: 'New look', trim: true },
		tags: { type: [String], default: [] },
		branch: { type: String, default: 'rehab', lowercase: true, trim: true },
		stylist: { type: String, default: 'team', lowercase: true, trim: true },
		service: { type: String, default: 'styling', lowercase: true, trim: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const bookingSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('book') },
		branch: { type: String, required: true, lowercase: true, trim: true },
		stylist: { type: String, required: true, lowercase: true, trim: true },
		service: { type: String, required: true, trim: true },
		date: { type: String, required: true, trim: true },
		time: { type: String, required: true, trim: true },
		duration: { type: Number, default: 60 },
		mobile: { type: String, default: '', trim: true },
		status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' },
		paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
		paymentMethod: { type: String, enum: ['cash', 'visa', 'none'], default: 'none', lowercase: true, trim: true },
		notes: { type: String, default: '', trim: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const articleSchema = new Schema(
	{
		title: { type: String, required: true, trim: true },
		slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
		summary: { type: String, default: '', trim: true },
		content: { type: String, default: '', trim: true },
		author: { type: String, default: '', trim: true },
		tags: { type: [String], default: [] },
		status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
		publishedAt: { type: Date, default: null },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const employeeSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('emp') },
		name: { type: String, required: true, trim: true },
		role: { type: String, default: 'Staff', trim: true },
		branch: { type: String, default: 'rehab', lowercase: true, trim: true },
		status: { type: String, enum: ['active', 'inactive'], default: 'active' },
		baseSalary: { type: Number, default: 0 },
		hourlyRate: { type: Number, default: 0 },
		startDate: { type: String, default: '' },
		notes: { type: String, default: '', trim: true },
		loginPhone: { type: String, default: '', trim: true },
		loginPin: { type: String, default: '', trim: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const attendanceSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('att') },
		employeeId: { type: String, required: true, trim: true },
		date: { type: String, required: true, trim: true },
		checkIn: { type: String, default: '', trim: true },
		checkOut: { type: String, default: '', trim: true },
		hours: { type: Number, default: 0 },
		notes: { type: String, default: '', trim: true },
		archived: { type: Boolean, default: false },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const Stylist = mongoose.models.Stylist || mongoose.model('Stylist', stylistSchema);
const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', pricingSchema);
const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

const sessionTokenSchema = new Schema(
	{
		token: { type: String, unique: true, index: true },
		role: { type: String, default: 'admin' },
		employeeId: { type: String, default: '' },
		expiresAt: { type: Date, required: true },
		meta: { type: Schema.Types.Mixed, default: {} },
	},
	{ timestamps: true }
);

const SessionToken = mongoose.models.SessionToken || mongoose.model('SessionToken', sessionTokenSchema);

module.exports = { Stylist, Pricing, Gallery, Booking, Article, Employee, Attendance, SessionToken };
 