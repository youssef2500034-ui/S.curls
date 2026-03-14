const { Message, Client } = require('../models/mydataschema');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_FROM,
} = process.env;

function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) return null;
  try {
    return require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  } catch (err) {
    return null;
  }
}

async function listMessages(req, res) {
  const mobile = (req.query.mobile || '').trim();
  const query = mobile ? { clientMobile: mobile } : {};
  const messages = await Message.find(query).sort({ createdAt: -1 }).limit(200);
  res.json(messages.map((m) => m.toJSON()));
}

async function sendMessage(req, res) {
  const { mobile, body, sender = 'admin' } = req.body || {};
  if (!mobile || !body) return res.status(400).json({ error: 'mobile and body required' });

  const msg = await Message.create({ clientMobile: mobile, body, sender, status: 'queued' });
  const twilio = getTwilioClient();

  if (twilio) {
    try {
      await twilio.messages.create({ from: TWILIO_FROM, to: mobile, body });
      msg.status = 'sent';
      await msg.save();
    } catch (err) {
      msg.status = 'failed';
      msg.meta = { error: err.message };
      await msg.save();
      return res.status(502).json({ error: 'SMS send failed', detail: err.message });
    }
  }

  // Update client last contact
  await Client.findOneAndUpdate(
    { mobile },
    { $setOnInsert: { mobile }, $set: { lastContactAt: new Date() } },
    { upsert: true, returnDocument: 'after' }
  );

  res.status(201).json(msg.toJSON());
}

module.exports = { listMessages, sendMessage };
