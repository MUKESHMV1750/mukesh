const path = require('path');

/**
 * Safe filename for disk paths and Drive metadata
 */
function sanitizeFilename(name) {
  const base = path.basename(String(name || 'file')).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const trimmed = base.trim() || 'file';
  return trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
}

module.exports = sanitizeFilename;
