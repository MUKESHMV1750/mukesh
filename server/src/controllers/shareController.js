const fs = require('fs');
const path = require('path');
const shareService = require('../services/shareService');
const sheetsService = require('../services/sheetsService');
const driveService = require('../services/driveService');
const AppError = require('../utils/AppError');

const uploadsDir = require('../utils/uploadsDir');

/**
 * POST /api/v1/files/:id/share
 */
async function createShare(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    const expiresInHours = req.body.expires_in_hours || 24;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const shareData = await shareService.createShareLink(
      file.file_id,
      file.file_name,
      baseUrl,
      expiresInHours
    );

    res.status(201).json({
      success: true,
      data: shareData,
      message: 'Share link created',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/shares/:id
 */
async function revokeShare(req, res, next) {
  try {
    const revoked = await shareService.revokeShareLink(req.params.id);
    if (!revoked) throw new AppError('Share link not found', 404);

    res.json({ success: true, message: 'Share link revoked' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/share/:token (public route)
 */
async function accessSharedFile(req, res, next) {
  try {
    const { token } = req.params;
    const validation = await shareService.validateShareToken(token);

    if (!validation.valid) {
      throw new AppError(validation.reason, 403);
    }

    const file = await sheetsService.getFileById(validation.share.file_id);
    if (!file) throw new AppError('File not found', 404);

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.file_name)}"`
    );

    // If stored locally
    const localPath = path.join(uploadsDir, `${file.file_id}_${file.file_name}`);
    if (fs.existsSync(localPath)) {
      return fs.createReadStream(localPath).pipe(res);
    }

    // Otherwise download from Google Drive
    if (file.drive_file_id && !file.drive_file_id.startsWith('local_')) {
      const stream = await driveService.downloadFromDrive(file.drive_file_id);
      return stream.pipe(res);
    }

    throw new AppError('File content not found', 404);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/:id/shares
 */
async function getFileShares(req, res, next) {
  try {
    const shares = await shareService.getSharesForFile(req.params.id);
    res.json({ success: true, data: shares });
  } catch (err) {
    next(err);
  }
}

module.exports = { createShare, revokeShare, accessSharedFile, getFileShares };
