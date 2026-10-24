const fs = require('fs');
const path = require('path');
const stream = require('stream');
const driveService = require('./driveService');
const { readSheet, appendMultipleRows, replaceDataRows } = require('../config/googleSheets');
const uploadsDir = require('../utils/uploadsDir');

const CHUNK_SIZE = 40000; // 40KB base64 chunk (well within Sheets 50K cell limit)

/**
 * Save file content into persistent storage:
 * 1. Attempts Google Drive first (if configured and quota allows)
 * 2. If Drive is unavailable or fails, saves to Google Sheets 'FileData' tab
 * 3. Keeps a local copy in uploadsDir for high-speed instant access
 */
async function saveFile(fileId, buffer, fileName, mimeType, targetDriveFolderId = null) {
  // Always cache locally for instant access within this process/container
  const localFilePath = path.join(uploadsDir, `${fileId}_${fileName}`);
  try {
    fs.writeFileSync(localFilePath, buffer);
  } catch (err) {
    console.warn(`Local cache write notice for ${fileId}:`, err.message);
  }

  // 1. Try Google Drive if configured
  try {
    const driveResult = await driveService.uploadToDrive(
      buffer,
      fileName,
      mimeType,
      targetDriveFolderId || undefined
    );
    if (driveResult && driveResult.id) {
      return { driveFileId: driveResult.id, storageType: 'drive' };
    }
  } catch (driveErr) {
    console.warn(`Drive upload notice for "${fileName}": ${driveErr.message}. Persisting in Google Sheets.`);
  }

  // 2. Persist in Google Sheets FileData tab (chunked base64)
  const base64 = buffer.toString('base64');
  const rows = [];
  const totalChunks = Math.ceil(base64.length / CHUNK_SIZE);

  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE);
    const chunkData = base64.substring(i, i + CHUNK_SIZE);
    rows.push([fileId, String(chunkIndex), chunkData]);
  }

  await appendMultipleRows('FileData', rows);
  return { driveFileId: 'sheet_' + fileId, storageType: 'sheet' };
}

/**
 * Retrieve a readable stream for a file from:
 * 1. Local disk cache (uploadsDir)
 * 2. Google Drive (if drive_file_id is a valid Drive ID)
 * 3. Google Sheets 'FileData' tab (chunked base64)
 */
async function getFileStream(file) {
  // 1. Check local disk cache
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
    try {
      const stat = fs.statSync(localPath);
      if (stat.size > 0) {
        return {
          stream: fs.createReadStream(localPath),
          size: stat.size,
          source: 'local',
        };
      }
    } catch (e) {}
  }

  // 2. Google Drive (if actual drive ID, not starting with local_ or sheet_)
  const isDriveId =
    file.drive_file_id &&
    !file.drive_file_id.startsWith('local_') &&
    !file.drive_file_id.startsWith('sheet_');

  if (isDriveId) {
    try {
      const driveStream = await driveService.downloadFromDrive(file.drive_file_id);
      return {
        stream: driveStream,
        size: file.size_bytes,
        source: 'drive',
      };
    } catch (driveErr) {
      console.warn(`Drive download stream notice for ${file.file_id}:`, driveErr.message);
    }
  }

  // 3. Google Sheets FileData tab
  try {
    const rows = await readSheet('FileData');
    if (rows && rows.length > 1) {
      const matchingRows = rows.slice(1).filter((r) => r[0] === file.file_id);
      if (matchingRows.length > 0) {
        matchingRows.sort((a, b) => Number(a[1]) - Number(b[1]));
        const base64Data = matchingRows.map((r) => r[2] || '').join('');
        const buffer = Buffer.from(base64Data, 'base64');

        // Populate local cache for instant future hits
        try {
          fs.writeFileSync(localPath, buffer);
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

  return null;
}

/**
 * Delete a file's content from all storage locations
 */
async function deleteFileContent(file) {
  // 1. Remove from local cache
  try {
    const localPath = path.join(uploadsDir, `${file.file_id}_${file.file_name}`);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  } catch (e) {}

  // 2. Remove from Drive if applicable
  if (
    file.drive_file_id &&
    !file.drive_file_id.startsWith('local_') &&
    !file.drive_file_id.startsWith('sheet_')
  ) {
    try {
      await driveService.removeFromDrive(file.drive_file_id);
    } catch (e) {}
  }

  // 3. Remove rows from FileData sheet
  try {
    const rows = await readSheet('FileData');
    if (rows && rows.length > 1) {
      const remainingRows = rows.slice(1).filter((r) => r[0] !== file.file_id);
      if (remainingRows.length !== rows.length - 1) {
        await replaceDataRows('FileData', remainingRows);
      }
    }
  } catch (e) {
    console.warn(`FileData removal notice for ${file.file_id}:`, e.message);
  }
}

module.exports = {
  saveFile,
  getFileStream,
  deleteFileContent,
};
