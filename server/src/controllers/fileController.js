const fs = require('fs');
const path = require('path');
const sheetsService = require('../services/sheetsService');
const driveService = require('../services/driveService');
const uploadService = require('../services/uploadService');
const AppError = require('../utils/AppError');
const { appendRow, readSheet } = require('../config/googleSheets');
const { generateId } = require('../utils/generateToken');

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
    if (file.drive_file_id && !file.drive_file_id.startsWith('local_')) {
      try {
        driveInfo = await driveService.getFileInfo(file.drive_file_id);
      } catch (e) {
        console.warn('Drive preview notice:', e.message);
      }
    }

    const inlineDownloadUrl = `/api/v1/files/${file.file_id}/download?inline=true`;

    res.json({
      success: true,
      data: {
        ...file,
        stream_url: inlineDownloadUrl,
        webViewLink: driveInfo.webViewLink || inlineDownloadUrl,
        webContentLink: driveInfo.webContentLink || inlineDownloadUrl,
        thumbnailLink: driveInfo.thumbnailLink || (file.mime_type?.startsWith('image/') ? inlineDownloadUrl : ''),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/:id/download
 */
async function downloadFile(req, res, next) {
  try {
    const file = await sheetsService.getFileById(req.params.id);
    if (!file) throw new AppError('File not found', 404);

    const isInline = req.query.inline === 'true' || req.query.view === 'true' || req.query.thumbnail === 'true';
    const mimeType = resolveMimeType(file.file_name, file.mime_type);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `${isInline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(file.file_name)}"`
    );

    // Cache thumbnails and inline previews for 24 hours
    if (isInline) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    }

    // 1. Check local storage
    let localPath = path.join(uploadsDir, `${file.file_id}_${file.file_name}`);
    if (!fs.existsSync(localPath) && fs.existsSync(uploadsDir)) {
      try {
        const diskFiles = fs.readdirSync(uploadsDir);
        const match = diskFiles.find((f) => f.startsWith(`${file.file_id}_`));
        if (match) {
          localPath = path.join(uploadsDir, match);
        }
      } catch (e) {}
    }

    if (fs.existsSync(localPath)) {
      return fs.createReadStream(localPath).pipe(res);
    }

    // 2. Otherwise download from Google Drive
    if (file.drive_file_id && !file.drive_file_id.startsWith('local_')) {
      try {
        const stream = await driveService.downloadFromDrive(file.drive_file_id);
        return stream.pipe(res);
      } catch (driveErr) {
        console.warn(`Drive download stream notice for ${file.file_id}:`, driveErr.message);
        if (req.query.thumbnail === 'true') {
          const meta = await driveService.getFileInfo(file.drive_file_id).catch(() => null);
          if (meta?.thumbnailLink) {
            return res.redirect(meta.thumbnailLink);
          }
        }
        throw driveErr;
      }
    }

    throw new AppError('File content not found', 404);
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
      const oldExactPath = path.join(uploadsDir, `${file.file_id}_${file.file_name}`);
      const newExactPath = path.join(uploadsDir, `${file.file_id}_${finalName}`);
      if (fs.existsSync(oldExactPath)) {
        fs.renameSync(oldExactPath, newExactPath);
      } else if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        const match = files.find((f) => f.startsWith(`${file.file_id}_`));
        if (match) {
          fs.renameSync(path.join(uploadsDir, match), newExactPath);
        }
      }
    } catch (fsErr) {
      console.warn('Local file rename notice:', fsErr.message);
    }

    // If in Google Drive, rename in Drive
    if (file.drive_file_id && !file.drive_file_id.startsWith('local_')) {
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
    if (file.drive_file_id && !file.drive_file_id.startsWith('local_') && targetDriveFolderId) {
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

    // 1. Delete from Google Drive if real Drive file
    if (file.drive_file_id && !file.drive_file_id.startsWith('local_')) {
      try {
        await driveService.removeFromDrive(file.drive_file_id);
      } catch (driveErr) {
        console.warn(`Drive remove notice for ${file.drive_file_id}:`, driveErr.message);
      }
    }

    // 2. Delete local file from disk
    deleteLocalFile(file.file_id);

    // 3. Delete from Sheets
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
      // 1. Delete from Google Drive if real Drive file
      if (file.drive_file_id && !file.drive_file_id.startsWith('local_')) {
        try {
          await driveService.removeFromDrive(file.drive_file_id);
        } catch (driveErr) {
          console.warn(`Drive remove notice for ${file.drive_file_id}:`, driveErr.message);
        }
      }

      // 2. Delete from local disk
      deleteLocalFile(file.file_id);
    }

    // 3. Purge all trashed records from Google Sheets
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

module.exports = {
  listFiles,
  uploadFiles,
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
