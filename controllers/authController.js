const { issueToken } = require('../routes/utils');

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

async function login(req, res) {
  const { email, username, password } = req.body || {};
  const userInput = (email || username || '').toString().toLowerCase();
  const passInput = (password || '').toString();

  if (userInput !== ADMIN_USER.toLowerCase() || passInput !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = await issueToken({ role: 'admin' });
  res.json(token);
}

module.exports = { login };
