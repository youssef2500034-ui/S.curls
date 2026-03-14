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
		name: { type: String, required: true, trim: true, lowercase: true, index: true },
		branch: { type: String, default: 'rehab', lowercase: true, trim: true, index: true },
		title: { type: String, default: '', trim: true },
		specialties: { type: [String], default: [] },
		times: { type: [String], default: [] },
		bio: { type: String, default: '', trim: true },
		phone: { type: String, default: '', trim: true },
		visible: { type: Boolean, default: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

// Ensure uniqueness per branch to avoid duplicate staff cards
stylistSchema.index({ name: 1, branch: 1 }, { unique: true });

const clientSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('cli') },
		name: { type: String, default: '', trim: true },
		email: { type: String, default: '', lowercase: true, trim: true },
		mobile: { type: String, required: true, trim: true, index: true, unique: true },
		visitCount: { type: Number, default: 0 },
		lastVisitDate: { type: String, default: '' },
		bookingHistory: { type: [String], default: [] },
		preferredBranch: { type: String, default: '', lowercase: true, trim: true },
		preferredStylist: { type: String, default: '', lowercase: true, trim: true },
		lastContactAt: { type: Date },
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
		name: { type: String, default: '', trim: true },
		email: { type: String, default: '', trim: true, lowercase: true },
		status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' },
		paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
		paymentMethod: { type: String, enum: ['cash', 'card', 'instapay', 'none'], default: 'none', lowercase: true, trim: true },
		client: { type: String, ref: 'Client', default: '' },
		notes: { type: String, default: '', trim: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const productSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('prod') },
		name: { type: String, required: true, trim: true },
		description: { type: String, default: '', trim: true },
		price: { type: Number, required: true, min: 0 },
		image: { type: String, default: '', trim: true },
		brand: { type: String, default: '', trim: true },
		category: { type: String, default: 'general', lowercase: true, trim: true },
		stock: { type: Number, default: 0, min: 0 },
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

const ratingSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('rat') },
		bookingId: { type: String, required: true, trim: true },
		stylist: { type: String, required: true, trim: true, lowercase: true },
		clientMobile: { type: String, required: true, trim: true },
		score: { type: Number, min: 1, max: 5, required: true },
		comment: { type: String, default: '', trim: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const testimonialSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('tes') },
		name: { type: String, required: true, trim: true },
		service: { type: String, default: '', trim: true },
		comment: { type: String, required: true, trim: true },
		rating: { type: Number, min: 1, max: 5, default: 5 },
		stylist: { type: String, default: '', trim: true, lowercase: true },
		verified: { type: Boolean, default: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const messageSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('msg') },
		clientMobile: { type: String, required: true, trim: true },
		body: { type: String, required: true, trim: true },
		sender: { type: String, default: 'admin', trim: true },
		status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
		meta: { type: Schema.Types.Mixed, default: {} },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const orderItemSchema = new Schema(
	{
		productId: { type: String, required: true },
		name: { type: String, required: true },
		price: { type: Number, required: true },
		qty: { type: Number, default: 1 },
		image: { type: String, default: '' },
	},
	{ _id: false }
);

const orderSchema = new Schema(
	{
		_id: { type: String, default: () => makeId('ord') },
		clientMobile: { type: String, required: true, trim: true },
		items: { type: [orderItemSchema], default: [] },
		subtotal: { type: Number, default: 0 },
		paymentMethod: { type: String, enum: ['cash', 'card', 'instapay'], default: 'cash' },
		status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending' },
		shippingAddress: { type: String, default: '', trim: true },
	},
	{ timestamps: true, toJSON: { virtuals: true, transform: baseTransform } }
);

const Stylist = mongoose.models.Stylist || mongoose.model('Stylist', stylistSchema);
const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);
const Pricing = mongoose.models.Pricing || mongoose.model('Pricing', pricingSchema);
const Gallery = mongoose.models.Gallery || mongoose.model('Gallery', gallerySchema);
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
const Rating = mongoose.models.Rating || mongoose.model('Rating', ratingSchema);
const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

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

module.exports = { Stylist, Client, Pricing, Gallery, Booking, Article, Employee, Attendance, Rating, Testimonial, Message, Order, Product, SessionToken };
 