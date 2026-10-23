const crypto = require('crypto');
const config = require('../config/env');

const SECRET = config.sessionSecret || 'drivex-secret-key';

/**
 * Generate a cryptographically signed admin token
 */
function generateAdminToken() {
  const payload = {
    isAdmin: true,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify an admin token
 */
function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

  // Constant-time comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return false;
    }
  } catch (e) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.isAdmin) return false;
    if (payload.exp && Date.now() > payload.exp) return false;
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { generateAdminToken, verifyAdminToken };
