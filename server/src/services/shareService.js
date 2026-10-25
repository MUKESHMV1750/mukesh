const { readSheet, appendRow, updateCell, findRowIndex } = require('../config/googleSheets');
const { generateShareToken, generateId, hashToken } = require('../utils/generateToken');
const { buildWhatsAppUrl } = require('../utils/encodeMessage');
const config = require('../config/env');

const SHEET_NAME = 'Shares';

const COL = {
  SHARE_ID: 0,
  FILE_ID: 1,
  TOKEN_HASH: 2,
  PERMISSION: 3,
  EXPIRES_AT: 4,
  STATUS: 5,
};

function rowToShare(row) {
  return {
    share_id: row[COL.SHARE_ID] || '',
    file_id: row[COL.FILE_ID] || '',
    token_hash: row[COL.TOKEN_HASH] || '',
    permission: row[COL.PERMISSION] || 'view',
    expires_at: row[COL.EXPIRES_AT] || '',
    status: row[COL.STATUS] || 'active',
  };
}

/**
 * Create a share link for a file.
 * User-facing URL points at the React /share/:token page.
 * download_url hits the API for the actual file bytes.
 */
async function createShareLink(fileId, fileName, apiBaseUrl, expiresInHours = 24) {
  const token = generateShareToken();
  const tokenHash = hashToken(token);
  const shareId = generateId();

  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000
  ).toISOString();

  await appendRow(SHEET_NAME, [
    shareId,
    fileId,
    tokenHash,
    'view',
    expiresAt,
    'active',
  ]);

  const clientBase = (config.clientUrl || '').replace(/\/+$/, '');
  const apiBase = (apiBaseUrl || '').replace(/\/+$/, '');

  // Prefer frontend share page; fall back to API download URL
  const shareUrl = clientBase
    ? `${clientBase}/share/${token}`
    : `${apiBase}/api/v1/share/${token}`;
  const downloadUrl = `${apiBase}/api/v1/share/${token}`;
  const whatsappUrl = buildWhatsAppUrl(fileName, shareUrl);

  return {
    share_id: shareId,
    share_url: shareUrl,
    download_url: downloadUrl,
    whatsapp_url: whatsappUrl,
    expires_at: expiresAt,
    token,
  };
}

/**
 * Validate a share token and return file info
 */
async function validateShareToken(token) {
  const tokenHash = hashToken(token);
  const rows = await readSheet(SHEET_NAME);

  for (let i = 1; i < rows.length; i++) {
    const share = rowToShare(rows[i]);
    if (share.token_hash === tokenHash) {
      if (share.status !== 'active') {
        return { valid: false, reason: 'Share link has been revoked' };
      }
      if (new Date(share.expires_at) < new Date()) {
        return { valid: false, reason: 'Share link has expired' };
      }
      return { valid: true, share };
    }
  }

  return { valid: false, reason: 'Invalid share link' };
}

/**
 * Revoke a share link
 */
async function revokeShareLink(shareId) {
  const rowIndex = await findRowIndex(SHEET_NAME, COL.SHARE_ID, shareId);
  if (rowIndex === -1) return false;

  const rows = await readSheet(SHEET_NAME);
  const row = rows[rowIndex - 1];
  row[COL.STATUS] = 'revoked';

  await updateCell(SHEET_NAME, `A${rowIndex}:F${rowIndex}`, row);
  return true;
}

/**
 * Get all shares for a file
 */
async function getSharesForFile(fileId) {
  const rows = await readSheet(SHEET_NAME);
  return rows
    .slice(1)
    .map(rowToShare)
    .filter((s) => s.file_id === fileId && s.status === 'active');
}

module.exports = {
  createShareLink,
  validateShareToken,
  revokeShareLink,
  getSharesForFile,
};
