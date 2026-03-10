const crypto = require('crypto');
const { SessionToken } = require('../models/mydataschema');

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const tokens = new Map(); // token -> { expires, meta }

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function cleanArray(list) {
  if (Array.isArray(list)) return list.filter(Boolean);
  if (typeof list === 'string') {
    return list
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

async function issueToken(meta = {}) {
  const token = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + TOKEN_TTL_MS;
  tokens.set(token, { expires, meta });
  try {
    await SessionToken.create({ token, role: meta.role || 'admin', employeeId: meta.employeeId || '', expiresAt: new Date(expires), meta });
  } catch (_) {
    // ignore persistence errors
  }
  return { token, expiresIn: TOKEN_TTL_MS / 1000 };
}

async function getAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  let record = tokens.get(token);
  if (!record) {
    try {
      const dbRec = await SessionToken.findOne({ token }).lean();
      if (dbRec) {
        record = { expires: dbRec.expiresAt?.getTime?.() || 0, meta: dbRec.meta || { role: dbRec.role, employeeId: dbRec.employeeId } };
        tokens.set(token, record);
      }
    } catch (_) {
      /* ignore */
    }
  }
  if (!record) return null;
  const { expires, meta = {} } = typeof record === 'number' ? { expires: record, meta: {} } : record;
  if (!expires || expires < Date.now()) {
    tokens.delete(token);
    try { await SessionToken.deleteOne({ token }); } catch (_) {}
    return null;
  }
  return { token, meta };
}

async function authRequired(req, res, next) {
  const auth = await getAuth(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  req.user = auth;
  next();
}

module.exports = {
  asyncHandler,
  makeId,
  cleanArray,
  issueToken,
  getAuth,
  authRequired,
  tokens,
  TOKEN_TTL_MS,
};
