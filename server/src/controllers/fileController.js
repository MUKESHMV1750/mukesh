const fs = require('fs');
const path = require('path');
const sheetsService = require('../services/sheetsService');
const driveService = require('../services/driveService');
const fileStorageService = require('../services/fileStorageService');
const uploadService = require('../services/uploadService');
const AppError = require('../utils/AppError');
const { appendRow, readSheet } = require('../config/googleSheets');
const { generateId } = require('../utils/generateToken');
const sanitizeFilename = require('../utils/sanitizeFilename');

const uploadsDir = require('../utils/uploadsDir');

const MIME_MAP = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

function resolveMimeType(fileName, existingMime) {
  if (existingMime && existingMime !== 'application/octet-stream') {
    return existingMime;
  }
  const ext = fileName ? fileName.split('.').pop().toLowerCase() : '';
  return MIME_MAP[ext] || 'application/octet-stream';
}

/**
 * GET /api/v1/files
 */
async function listFiles(req, res, next) {
  try {
    const { folder_id, search, sort_by, sort_order, starred, is_starred, trashed, is_trashed, status } = req.query;

    const filters = {};
    if (folder_id !== undefined) filters.folder_id = folder_id;
    if (search) filters.search = search;
    if (sort_by) filters.sort_by = sort_by;
    if (sort_order) filters.sort_order = sort_order;

    const starredParam = starred !== undefined ? starred : is_starred;
    if (starredParam === 'true' || starredParam === true) filters.is_starred = true;
    else if (starredParam === 'false' || starredParam === false) filters.is_starred = false;

    // Support status parameter ('trashed' or 'active')
    if (status === 'trashed') {
      filters.is_trashed = true;
    } else if (status === 'active') {
      filters.is_trashed = false;
    }

    // Explicit trashed or is_trashed parameter overrides status if present
    const trashedParam = trashed !== undefined ? trashed : is_trashed;
    if (trashedParam === 'true' || trashedParam === true) filters.is_trashed = true;
    else if (trashedParam === 'false' || trashedParam === false) filters.is_trashed = false;

    const files = await sheetsService.getAllFiles(filters);
    res.json({ success: true, data: files, count: files.length });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/files/upload
 */
async function uploadFiles(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const folderId = req.body.folder_id || '';
    const { results, errors } = await uploadService.processMultipleUploads(
      req.files,
      folderId
    );

    // Asynchronously log activity so user response isn't delayed
    Promise.allSettled(
      results.map((file) =>
        appendRow('Activity', [
          generateId(),
          'upload',
          file.file_id,
          new Date().toISOString(),
        ])
      )
    ).catch(() => {});

    res.status(201).json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `${results.length} file(s) uploaded successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/:id/preview
 */
async function previewFile(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    let driveInfo = {};
    const isRealDriveId =
      file.drive_file_id &&
      !file.drive_file_id.startsWith('local_') &&
      !file.drive_file_id.startsWith('sheet_');

    if (isRealDriveId) {
      try {
        driveInfo = await driveService.getFileInfo(file.drive_file_id);
      } catch (e) {
        console.warn('Drive preview notice:', e.message);
      }
    }

    const inlineDownloadUrl = `/api/v1/files/${file.file_id}/download?inline=true`;
    const isImage =
      (file.mime_type || '').startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file.file_name || '');

    res.json({
      success: true,
      data: {
        ...file,
        stream_url: inlineDownloadUrl,
        webViewLink: driveInfo.webViewLink || inlineDownloadUrl,
        webContentLink: driveInfo.webContentLink || inlineDownloadUrl,
        thumbnailLink:
          driveInfo.thumbnailLink || (isImage ? inlineDownloadUrl : ''),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/:id/download
 * Supports Range requests for video/audio seeking.
 */
async function downloadFile(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    const isInline =
      req.query.inline === 'true' ||
      req.query.view === 'true' ||
      req.query.thumbnail === 'true';
    const mimeType = resolveMimeType(file.file_name, file.mime_type);

    const fileStreamObj = await fileStorageService.getFileStream(file);

    if (!fileStreamObj) {
      if (req.query.thumbnail === 'true') {
        return res.status(404).json({ success: false, message: 'Thumbnail not available' });
      }
      throw new AppError(
        'File content not found. The file may be missing from storage. Please re-upload.',
        404
      );
    }

    const totalSize = fileStreamObj.size ? Number(fileStreamObj.size) : undefined;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${isInline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(file.file_name)}`
    );

    if (isInline) {
      res.setHeader('Cache-Control', 'private, max-age=86400, stale-while-revalidate=3600');
    } else {
      res.setHeader('Cache-Control', 'private, no-store');
    }

    // Local file + Range → efficient partial reads (video/audio scrubbing)
    if (
      range &&
      totalSize &&
      fileStreamObj.path &&
      fs.existsSync(fileStreamObj.path)
    ) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      if (Number.isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${totalSize}`);
        return res.end();
      }
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);
      const partial = fs.createReadStream(fileStreamObj.path, { start, end });
      partial.on('error', (err) => {
        console.warn('Partial stream error:', err.message);
        if (!res.headersSent) next(err);
        else res.destroy();
      });
      return partial.pipe(res);
    }

    if (totalSize) {
      res.setHeader('Content-Length', totalSize);
    }

    fileStreamObj.stream.on('error', (err) => {
      console.warn('Download stream error:', err.message);
      if (!res.headersSent) {
        next(err);
      } else {
        res.destroy();
      }
    });

    return fileStreamObj.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/files/:id/rename
 */
async function renameFile(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new AppError('File name cannot be empty', 400);
    }

    const trimmedName = name.trim();
    // Validate invalid characters: / \ : * ? " < > |
    if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmedName)) {
      throw new AppError('File name contains invalid characters (/ \\ : * ? " < > |)', 400);
    }

    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    // Preserve original extension if user didn't specify one
    const oldExt = file.file_name.includes('.') ? file.file_name.split('.').pop() : '';
    let finalName = trimmedName;
    if (oldExt && !finalName.includes('.')) {
      finalName = `${finalName}.${oldExt}`;
    }

    // Check for duplicate names in the same folder
    const folderFiles = await sheetsService.getAllFiles({ folder_id: file.folder_id });
    const duplicate = folderFiles.find(
      (f) => f.file_id !== file.file_id && f.file_name.toLowerCase() === finalName.toLowerCase()
    );
    if (duplicate) {
      throw new AppError(`A file named "${finalName}" already exists in this folder`, 409);
    }

    // Update in Google Sheets
    const updated = await sheetsService.updateFile(req.params.id, {
      file_name: finalName,
    });
    if (!updated) throw new AppError('File not found', 404);

    // If stored locally, rename local file on disk
    try {
      const safeFinal = sanitizeFilename(finalName);
      const newExactPath = path.join(uploadsDir, `${file.file_id}_${safeFinal}`);
      const oldExactPath = path.join(
        uploadsDir,
        `${file.file_id}_${sanitizeFilename(file.file_name)}`
      );
      if (fs.existsSync(oldExactPath) && oldExactPath !== newExactPath) {
        fs.renameSync(oldExactPath, newExactPath);
      } else if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const match = files.find(
          (f) => f.startsWith(`${file.file_id}_`) && !f.startsWith('tmp_')
        );
        if (match) {
          const from = path.join(uploadsDir, match);
          if (from !== newExactPath) fs.renameSync(from, newExactPath);
        }
      }
    } catch (fsErr) {
      console.warn('Local file rename notice:', fsErr.message);
    }

    // If in Google Drive, rename in Drive
    if (
      file.drive_file_id &&
      !file.drive_file_id.startsWith('local_') &&
      !file.drive_file_id.startsWith('sheet_')
    ) {
      driveService.renameDriveFile(file.drive_file_id, finalName).catch((e) => {
        console.warn('Drive rename sync notice:', e.message);
      });
    }

    await appendRow('Activity', [
      generateId(), 'rename', req.params.id, new Date().toISOString(),
    ]);

    res.json({
      success: true,
      data: updated,
      message: 'File renamed successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/files/:id/move
 */
async function moveFile(req, res, next) {
  try {
    const { folder_id } = req.body;
    if (folder_id === undefined) throw new AppError('Target folder_id is required', 400);

    const targetFolderId = String(folder_id).trim();

    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    // If already in target folder, return early
    if (file.folder_id === targetFolderId) {
      return res.json({
        success: true,
        data: file,
        message: 'File is already in the selected folder',
      });
    }

    // If target folder is specified (not root), verify target folder exists
    let targetDriveFolderId = null;
    let targetFolderName = 'My Drive';
    if (targetFolderId) {
      const rows = await readSheet('Folders');
      const folderRow = rows.slice(1).find((r) => r[0] === targetFolderId);
      if (!folderRow) {
        throw new AppError('Target destination folder does not exist', 404);
      }
      targetFolderName = folderRow[1] || 'destination folder';
      targetDriveFolderId = folderRow[4] || null;
    }

    // Check for duplicate name in destination folder
    const targetFolderFiles = await sheetsService.getAllFiles({ folder_id: targetFolderId });
    const duplicate = targetFolderFiles.find(
      (f) => f.file_id !== file.file_id && f.file_name.toLowerCase() === file.file_name.toLowerCase()
    );
    if (duplicate) {
      throw new AppError(`A file named "${file.file_name}" already exists in ${targetFolderName}`, 409);
    }

    // Update in Google Sheets
    const updated = await sheetsService.updateFile(req.params.id, {
      folder_id: targetFolderId,
    });
    if (!updated) throw new AppError('File not found', 404);

    // If in Google Drive and target folder has drive folder ID, sync move in Drive
    if (
      file.drive_file_id &&
      !file.drive_file_id.startsWith('local_') &&
      !file.drive_file_id.startsWith('sheet_') &&
      targetDriveFolderId
    ) {
      driveService.moveDriveFile(file.drive_file_id, targetDriveFolderId).catch((e) => {
        console.warn('Drive move sync notice:', e.message);
      });
    }

    await appendRow('Activity', [
      generateId(), 'move', req.params.id, new Date().toISOString(),
    ]);

    res.json({
      success: true,
      data: updated,
      message: `File moved to ${targetFolderName} successfully`,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * PATCH /api/v1/files/:id/star
 */
async function toggleStar(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    const updated = await sheetsService.updateFile(req.params.id, {
      is_starred: !file.is_starred,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/files/:id (move to trash)
 */
async function trashFile(req, res, next) {
  try {
    const updated = await sheetsService.updateFile(req.params.id, {
      is_trashed: true,
    });
    if (!updated) throw new AppError('File not found', 404);

    await appendRow('Activity', [
      generateId(), 'trash', req.params.id, new Date().toISOString(),
    ]);

    res.json({ success: true, message: 'File moved to trash' });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/files/:id/restore
 */
async function restoreFile(req, res, next) {
  try {
    const updated = await sheetsService.updateFile(req.params.id, {
      is_trashed: false,
    });
    if (!updated) throw new AppError('File not found', 404);

    res.json({ success: true, data: updated, message: 'File restored' });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to delete local disk files for a fileId
 */
function deleteLocalFile(fileId) {
  try {
    if (fs.existsSync(uploadsDir)) {
      const diskFiles = fs.readdirSync(uploadsDir);
      for (const diskFile of diskFiles) {
        if (diskFile.startsWith(`${fileId}_`)) {
          fs.unlinkSync(path.join(uploadsDir, diskFile));
        }
      }
    }
  } catch (err) {
    console.warn(`Local file removal notice for ${fileId}:`, err.message);
  }
}

/**
 * DELETE /api/v1/files/:id/permanent
 */
async function permanentDelete(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    // 1. Delete file content from storage (Drive, Sheets FileData, local cache)
    await fileStorageService.deleteFileContent(file);

    // 2. Delete from Sheets
    await sheetsService.deleteFileRecord(req.params.id);

    try {
      await appendRow('Activity', [
        generateId(), 'permanent_delete', req.params.id, new Date().toISOString(),
      ]);
    } catch (actErr) {}

    res.json({ success: true, message: 'File permanently deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/files/trash/empty
 */
async function emptyTrash(req, res, next) {
  try {
    const trashedFiles = await sheetsService.getAllFiles({ is_trashed: true });

    for (const file of trashedFiles) {
      await fileStorageService.deleteFileContent(file);
    }

    // Purge all trashed records from Google Sheets
    const purgedCount = await sheetsService.emptyTrashRecords();

    try {
      await appendRow('Activity', [
        generateId(), 'empty_trash', `count:${purgedCount}`, new Date().toISOString(),
      ]);
    } catch (actErr) {}

    res.json({
      success: true,
      message: `Trash emptied (${purgedCount} items permanently deleted)`,
      count: purgedCount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/recent
 */
async function getRecentFiles(req, res, next) {
  try {
    const files = await sheetsService.getRecentFiles(20);
    res.json({ success: true, data: files });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/files/:id/reupload
 */
async function reuploadFile(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    const uploaded = req.file || (req.files && req.files[0]);
    if (!uploaded) {
      throw new AppError('No file provided for re-upload', 400);
    }

    // Remove previous content first to avoid orphan Drive/Sheets data
    try {
      await fileStorageService.deleteFileContent(file);
    } catch (e) {
      console.warn('Reupload cleanup notice:', e.message);
    }

    let targetDriveFolderId;
    if (file.folder_id) {
      try {
        const rows = await readSheet('Folders');
        const folderRow = rows.slice(1).find((r) => r[0] === file.folder_id);
        if (folderRow && folderRow[4]) targetDriveFolderId = folderRow[4];
      } catch (e) {}
    }

    const source = uploaded.path
      ? { path: uploaded.path, size: uploaded.size }
      : { buffer: uploaded.buffer, size: uploaded.size };

    const { driveFileId, size } = await fileStorageService.saveFile(
      file.file_id,
      source,
      uploaded.originalname || file.file_name,
      uploaded.mimetype || file.mime_type,
      targetDriveFolderId || undefined
    );

    if (uploaded.path && fs.existsSync(uploaded.path)) {
      const cachePath = fileStorageService.localCachePath(
        file.file_id,
        uploaded.originalname || file.file_name
      );
      if (path.resolve(uploaded.path) !== path.resolve(cachePath)) {
        fileStorageService.cleanupTempUpload(uploaded.path);
      }
    }

    const updated = await sheetsService.updateFile(file.file_id, {
      file_name: sanitizeFilename(uploaded.originalname || file.file_name),
      size_bytes: size || uploaded.size,
      mime_type: uploaded.mimetype || file.mime_type,
      drive_file_id: driveFileId,
    });

    res.json({
      success: true,
      message: 'File content re-uploaded successfully',
      data: updated,
    });
  } catch (err) {
    if (req.file?.path) fileStorageService.cleanupTempUpload(req.file.path);
    next(err);
  }
}

module.exports = {
  listFiles,
  uploadFiles,
  reuploadFile,
  previewFile,
  downloadFile,
  renameFile,
  moveFile,
  toggleStar,
  trashFile,
  restoreFile,
  permanentDelete,
  emptyTrash,
  getRecentFiles,
};
