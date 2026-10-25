const fs = require('fs');
const sheetsService = require('./sheetsService');
const fileStorageService = require('./fileStorageService');
const { generateId } = require('../utils/generateToken');
const { readSheet } = require('../config/googleSheets');
const sanitizeFilename = require('../utils/sanitizeFilename');
const AppError = require('../utils/AppError');

/**
 * Normalize a multer file (disk or memory) into a saveFile source
 */
function toSource(file) {
  if (file.path) {
    const size = file.size || (fs.existsSync(file.path) ? fs.statSync(file.path).size : 0);
    return { path: file.path, size };
  }
  if (file.buffer) {
    return { buffer: file.buffer, size: file.size || file.buffer.length };
  }
  throw new Error('Uploaded file has no content');
}

/**
 * Avoid duplicate metadata rows for the same name in the same folder
 * (e.g. retry after a partial success). Returns existing record if a
 * non-trashed file with same name+size already exists in the folder.
 */
async function findRecentDuplicate(fileName, sizeBytes, folderId) {
  try {
    const files = await sheetsService.getAllFiles({
      folder_id: folderId || '',
      is_trashed: false,
    });
    const name = String(fileName || '').toLowerCase();
    const size = Number(sizeBytes) || 0;
    return (
      files.find(
        (f) =>
          f.file_name.toLowerCase() === name &&
          Number(f.size_bytes) === size &&
          // Same-session style: uploaded within last 2 minutes
          Date.now() - new Date(f.uploaded_at).getTime() < 2 * 60 * 1000
      ) || null
    );
  } catch (e) {
    return null;
  }
}

/**
 * Upload a file: persist content then record metadata in Sheets
 */
async function processUpload(file, folderId, preResolvedDriveFolderId = null) {
  let targetDriveFolderId = preResolvedDriveFolderId;
  if (folderId && targetDriveFolderId === null) {
    try {
      const rows = await readSheet('Folders');
      const folderRow = rows.slice(1).find((r) => r[0] === folderId);
      if (folderRow && folderRow[4]) {
        targetDriveFolderId = folderRow[4];
      }
    } catch (e) {
      // ignore lookup error
    }
  }

  const originalName = sanitizeFilename(file.originalname || 'file');
  const source = toSource(file);
  const mimeType = file.mimetype || 'application/octet-stream';

  // Deduplicate rapid retries of the same upload
  const existing = await findRecentDuplicate(originalName, source.size, folderId || '');
  if (existing && existing.drive_file_id) {
    // Content already stored — drop temp file and reuse metadata
    fileStorageService.cleanupTempUpload(file.path);
    return existing;
  }

  const fileId = generateId();

  let driveFileId;
  let finalSize = source.size;
  try {
    const saved = await fileStorageService.saveFile(
      fileId,
      source,
      originalName,
      mimeType,
      targetDriveFolderId || undefined
    );
    driveFileId = saved.driveFileId;
    finalSize = saved.size || source.size;
  } catch (err) {
    fileStorageService.cleanupTempUpload(file.path);
    if (err.statusCode) {
      throw new AppError(err.message, err.statusCode);
    }
    throw err;
  }

  // If saveFile moved/renamed the temp path, nothing left to clean.
  // If temp still exists (edge case), remove it.
  if (file.path && fs.existsSync(file.path)) {
    const cachePath = fileStorageService.localCachePath(fileId, originalName);
    if (pathResolveSafe(file.path) !== pathResolveSafe(cachePath)) {
      fileStorageService.cleanupTempUpload(file.path);
    }
  }

  try {
    const fileRecord = await sheetsService.addFile({
      file_id: fileId,
      file_name: originalName,
      mime_type: mimeType,
      size_bytes: finalSize,
      drive_file_id: driveFileId,
      folder_id: folderId || '',
      uploaded_at: new Date().toISOString(),
    });
    return fileRecord;
  } catch (metaErr) {
    // Roll back stored content so we don't leave orphans / broken links
    try {
      await fileStorageService.deleteFileContent({
        file_id: fileId,
        file_name: originalName,
        drive_file_id: driveFileId,
      });
    } catch (e) {}
    throw new AppError(
      metaErr.message || 'Failed to save file metadata',
      metaErr.statusCode || 500
    );
  }
}

function pathResolveSafe(p) {
  try {
    return require('path').resolve(p);
  } catch (e) {
    return p;
  }
}

/**
 * Upload multiple files with limited concurrency (avoids Drive/Sheets rate spikes)
 */
async function processMultipleUploads(files, folderId) {
  const results = [];
  const errors = [];

  let targetDriveFolderId = null;
  if (folderId) {
    try {
      const rows = await readSheet('Folders');
      const folderRow = rows.slice(1).find((r) => r[0] === folderId);
      if (folderRow && folderRow[4]) {
        targetDriveFolderId = folderRow[4];
      }
    } catch (e) {
      // ignore
    }
  }

  const queue = [...files];
  const MAX_CONCURRENT = 2;

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      try {
        const result = await processUpload(file, folderId, targetDriveFolderId);
        results.push(result);
      } catch (err) {
        fileStorageService.cleanupTempUpload(file.path);
        errors.push({
          fileName: file.originalname,
          error: err.message || 'Upload failed',
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENT, files.length) }, () => worker())
  );

  return { results, errors };
}

module.exports = { processUpload, processMultipleUploads };
