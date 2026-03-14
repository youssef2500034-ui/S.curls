const { Client, Booking } = require('../models/mydataschema');

async function list(_req, res) {
  const clients = await Client.find({}).sort({ visitCount: -1, updatedAt: -1 }).limit(200);
  res.json(clients.map((c) => c.toJSON()));
}

async function getOne(req, res) {
  const mobile = (req.params.mobile || '').trim();
  if (!mobile) return res.status(400).json({ error: 'Mobile required' });
  const client = await Client.findOne({ mobile });
  if (!client) return res.status(404).json({ error: 'Not found' });
  const bookings = await Booking.find({ mobile }).sort({ date: -1 });
  res.json({ ...client.toJSON(), bookings: bookings.map((b) => b.toJSON()) });
}

async function remove(req, res) {
  const mobile = (req.params.mobile || '').trim();
  if (!mobile) return res.status(400).json({ error: 'Mobile required' });
  const client = await Client.findOne({ mobile });
  if (!client) return res.status(404).json({ error: 'Not found' });

  await Booking.updateMany({ mobile }, { $unset: { client: '' } });
  await Client.deleteOne({ mobile });
  res.status(204).end();
}

module.exports = { list, getOne, remove };
