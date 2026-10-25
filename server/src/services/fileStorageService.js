const fs = require('fs');
const path = require('path');
const stream = require('stream');
const driveService = require('./driveService');
const { readSheet, appendMultipleRows, replaceDataRows } = require('../config/googleSheets');
const uploadsDir = require('../utils/uploadsDir');
const sanitizeFilename = require('../utils/sanitizeFilename');

/** Sheets cells max ~50K chars; keep chunks under that */
const CHUNK_SIZE = 40000;
/** Sheets FileData fallback supports files up to 25MB */
const SHEETS_MAX_BYTES = 25 * 1024 * 1024;

function localCachePath(fileId, fileName) {
  return path.join(uploadsDir, `${fileId}_${sanitizeFilename(fileName)}`);
}

function findLocalCachePath(file) {
  const exact = localCachePath(file.file_id, file.file_name);
  if (fs.existsSync(exact)) return exact;

  try {
    if (!fs.existsSync(uploadsDir)) return null;
    const diskFiles = fs.readdirSync(uploadsDir);
    const match = diskFiles.find((f) => f.startsWith(`${file.file_id}_`) && !f.startsWith('tmp_'));
    if (match) return path.join(uploadsDir, match);
  } catch (e) {}
  return null;
}

function isDriveStored(driveFileId) {
  return Boolean(
    driveFileId &&
      !driveFileId.startsWith('local_') &&
      !driveFileId.startsWith('sheet_')
  );
}

/**
 * Persist file content:
 * 1. Local cache (stable name by fileId)
 * 2. Google Drive (required for files > SHEETS_MAX_BYTES)
 * 3. Sheets FileData only for small files when Drive fails
 *
 * @param {string} fileId
 * @param {{ path?: string, buffer?: Buffer, size?: number }} source
 * @param {string} fileName
 * @param {string} mimeType
 * @param {string|null} targetDriveFolderId
 */
async function saveFile(fileId, source, fileName, mimeType, targetDriveFolderId = null) {
  const safeName = sanitizeFilename(fileName);
  const destPath = localCachePath(fileId, safeName);
  let size = source.size || 0;
  let sourcePath = source.path || null;

  // Normalize to a stable local cache path
  if (sourcePath && fs.existsSync(sourcePath)) {
    size = size || fs.statSync(sourcePath).size;
    if (path.resolve(sourcePath) !== path.resolve(destPath)) {
      try {
        fs.renameSync(sourcePath, destPath);
        sourcePath = destPath;
      } catch (renameErr) {
        try {
          fs.copyFileSync(sourcePath, destPath);
          try {
            fs.unlinkSync(sourcePath);
          } catch (e) {}
          sourcePath = destPath;
        } catch (copyErr) {
          console.warn(`Local cache copy notice for ${fileId}:`, copyErr.message);
        }
      }
    }
  } else if (source.buffer) {
    size = source.buffer.length;
    try {
      fs.writeFileSync(destPath, source.buffer);
      sourcePath = destPath;
    } catch (err) {
      console.warn(`Local cache write notice for ${fileId}:`, err.message);
    }
  }

  if (!size && sourcePath && fs.existsSync(sourcePath)) {
    size = fs.statSync(sourcePath).size;
  }

  // 1. Prefer Google Drive (stream from disk — supports up to 350MB)
  try {
    let driveResult;
    if (sourcePath && fs.existsSync(sourcePath)) {
      driveResult = await driveService.uploadToDrive(
        sourcePath,
        safeName,
        mimeType,
        targetDriveFolderId || undefined
      );
    } else if (source.buffer) {
      driveResult = await driveService.uploadToDrive(
        source.buffer,
        safeName,
        mimeType,
        targetDriveFolderId || undefined
      );
    }

    if (driveResult && driveResult.id) {
      return { driveFileId: driveResult.id, storageType: 'drive', size };
    }
  } catch (driveErr) {
    console.warn(
      `Drive upload notice for "${safeName}": ${driveErr.message}. Falling back if size allows.`
    );

    // Large files cannot use Sheets — fail clearly rather than create broken records
    if (size > SHEETS_MAX_BYTES) {
      const err = new Error(
        `Upload to Google Drive failed for a ${Math.round(size / (1024 * 1024))}MB file: ${driveErr.message}. For files over 25MB, configure GOOGLE_DRIVE_FOLDER_ID and share the folder with the service account.`
      );
      err.statusCode = 502;
      throw err;
    }
  }

  // 2. Sheets FileData fallback
  if (size > SHEETS_MAX_BYTES) {
    const err = new Error(
      'File is too large for Sheets fallback storage. Google Drive must be configured for files over 25MB.'
    );
    err.statusCode = 503;
    throw err;
  }

  let buffer = source.buffer;
  if (!buffer && sourcePath && fs.existsSync(sourcePath)) {
    buffer = fs.readFileSync(sourcePath);
  }
  if (!buffer) {
    const err = new Error('No file content available to persist');
    err.statusCode = 500;
    throw err;
  }

  // Remove any previous chunks for this fileId (re-upload safety)
  try {
    await deleteSheetChunks(fileId);
  } catch (e) {}

  const base64 = buffer.toString('base64');
  const rows = [];
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    rows.push([fileId, String(chunkIndex), base64.substring(i, i + CHUNK_SIZE)]);
  }

  // Batch append in groups to avoid huge single API payloads
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    await appendMultipleRows('FileData', rows.slice(i, i + BATCH));
  }

  return { driveFileId: 'sheet_' + fileId, storageType: 'sheet', size };
}

async function deleteSheetChunks(fileId) {
  const rows = await readSheet('FileData');
  if (!rows || rows.length <= 1) return;
  const remainingRows = rows.slice(1).filter((r) => r[0] !== fileId);
  if (remainingRows.length !== rows.length - 1) {
    await replaceDataRows('FileData', remainingRows);
  }
}

/**
 * Retrieve a readable stream for a file
 */
async function getFileStream(file) {
  // 1. Local disk cache
  const localPath = findLocalCachePath(file);
  if (localPath) {
    try {
      const stat = fs.statSync(localPath);
      if (stat.size > 0) {
        return {
          stream: fs.createReadStream(localPath),
          size: stat.size,
          source: 'local',
          path: localPath,
        };
      }
    } catch (e) {}
  }

  // 2. Google Drive
  if (isDriveStored(file.drive_file_id)) {
    try {
      const driveStream = await driveService.downloadFromDrive(file.drive_file_id);
      return {
        stream: driveStream,
        size: file.size_bytes ? Number(file.size_bytes) : undefined,
        source: 'drive',
      };
    } catch (driveErr) {
      console.warn(`Drive download stream notice for ${file.file_id}:`, driveErr.message);
    }
  }

  // 3. Google Sheets FileData
  if (file.drive_file_id && file.drive_file_id.startsWith('sheet_')) {
    try {
      const rows = await readSheet('FileData');
      if (rows && rows.length > 1) {
        const matchingRows = rows.slice(1).filter((r) => r[0] === file.file_id);
        if (matchingRows.length > 0) {
          matchingRows.sort((a, b) => Number(a[1]) - Number(b[1]));
          const base64Data = matchingRows.map((r) => r[2] || '').join('');
          const buffer = Buffer.from(base64Data, 'base64');

          const cachePath = localCachePath(file.file_id, file.file_name);
          try {
            fs.writeFileSync(cachePath, buffer);
          } catch (e) {}

          const passThrough = new stream.PassThrough();
          passThrough.end(buffer);

          return {
            stream: passThrough,
            size: buffer.length,
            source: 'sheet',
          };
        }
      }
    } catch (sheetErr) {
      console.warn(`Sheets file data read notice for ${file.file_id}:`, sheetErr.message);
    }
  }

  return null;
}

/**
 * Delete a file's content from all storage locations
 */
async function deleteFileContent(file) {
  // 1. Local cache (any name for this fileId)
  try {
    if (fs.existsSync(uploadsDir)) {
      const diskFiles = fs.readdirSync(uploadsDir);
      for (const diskFile of diskFiles) {
        if (diskFile.startsWith(`${file.file_id}_`)) {
          try {
            fs.unlinkSync(path.join(uploadsDir, diskFile));
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  // 2. Drive
  if (isDriveStored(file.drive_file_id)) {
    try {
      await driveService.removeFromDrive(file.drive_file_id);
    } catch (e) {}
  }

  // 3. Sheets FileData
  try {
    await deleteSheetChunks(file.file_id);
  } catch (e) {
    console.warn(`FileData removal notice for ${file.file_id}:`, e.message);
  }
}

/**
 * Remove a temporary multer upload if it still exists
 */
function cleanupTempUpload(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {}
}

module.exports = {
  saveFile,
  getFileStream,
  deleteFileContent,
  cleanupTempUpload,
  localCachePath,
  findLocalCachePath,
  SHEETS_MAX_BYTES,
};
