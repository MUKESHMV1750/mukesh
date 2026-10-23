const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Generate a unique share token
 */
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a unique ID
 */
function generateId() {
  return uuidv4();
}

/**
 * Hash a token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generateShareToken, generateId, hashToken };
