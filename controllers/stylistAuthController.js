const { Employee } = require('../models/mydataschema');
const { issueToken } = require('../routes/utils');

async function login(req, res) {
  const { phone, pin } = req.body || {};
  const phoneNorm = (phone || '').trim();
  const pinNorm = (pin || '').trim();
  if (!phoneNorm || !pinNorm) {
    return res.status(400).json({ error: 'Phone and PIN are required' });
  }

  const employee = await Employee.findOne({ $or: [ { loginPhone: phoneNorm }, { phone: phoneNorm } ], status: 'active' });
  if (!employee || (employee.loginPin || '') !== pinNorm) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = await issueToken({ role: 'stylist', employeeId: employee._id });
  res.json({ token: token.token, expiresIn: token.expiresIn, employee: employee.toJSON() });
}

module.exports = { login };
