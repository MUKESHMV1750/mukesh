const AppError = require('../utils/AppError');
const { verifyAdminToken } = require('../utils/adminToken');

/**
 * Extract token from request Authorization header or x-admin-token header
 */
function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
  if (req.headers && req.headers['x-admin-token']) {
    return String(req.headers['x-admin-token']).trim();
  }
  // Allow token via query param for direct media previews (img, video, audio, pdf)
  if (req.query && (req.query.token || req.query.auth)) {
    try {
      return decodeURIComponent(req.query.token || req.query.auth).trim();
    } catch (e) {
      return String(req.query.token || req.query.auth).trim();
    }
  }
  // Fallback: manually parse req.url in case serverless rewrite didn't populate req.query
  if (req.url && req.url.includes('?')) {
    try {
      const qIndex = req.url.indexOf('?');
      const params = new URLSearchParams(req.url.slice(qIndex));
      const qToken = params.get('token') || params.get('auth');
      if (qToken) {
        return decodeURIComponent(qToken).trim();
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Middleware to verify admin is authenticated via session OR signed Bearer token
 */
function authenticateAdmin(req, res, next) {
  // 1. Session check (cookies)
  if (req.session && req.session.isAdmin) {
    return next();
  }

  // 2. Bearer / x-admin-token token check (for cross-site cookies blocked by modern browsers)
  const token = extractToken(req);
  if (token && verifyAdminToken(token)) {
    return next();
  }

  return next(new AppError('Unauthorized. Please log in.', 401));
}

module.exports = authenticateAdmin;

