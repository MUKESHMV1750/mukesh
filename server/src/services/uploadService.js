const sheetsService = require('./sheetsService');
const driveService = require('./driveService');
const { generateId } = require('../utils/generateToken');

const { readSheet } = require('../config/googleSheets');

const fs = require('fs');
const path = require('path');
const uploadsDir = require('../utils/uploadsDir');

/**
 * Upload a file: store in Drive (or local fallback) and record metadata in Sheets
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

  const fileId = generateId();
  let driveFileId = '';

  // Attempt upload to Google Drive
  try {
    const driveResult = await driveService.uploadToDrive(
      file.buffer,
      file.originalname,
      file.mimetype,
      targetDriveFolderId || undefined
    );
    driveFileId = driveResult.id;
  } catch (driveErr) {
    console.warn(`Drive upload notice for "${file.originalname}": ${driveErr.message}. Storing locally.`);
    driveFileId = 'local_' + fileId;
    const localFilePath = path.join(uploadsDir, `${fileId}_${file.originalname}`);
    fs.writeFileSync(localFilePath, file.buffer);
  }

  // Record in Google Sheets
  const fileRecord = await sheetsService.addFile({
    file_id: fileId,
    file_name: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    drive_file_id: driveFileId,
    folder_id: folderId || '',
    uploaded_at: new Date().toISOString(),
  });

  return fileRecord;
}

/**
 * Upload multiple files
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
      // ignore lookup error
    }
  }

  for (const file of files) {
    try {
      const result = await processUpload(file, folderId, targetDriveFolderId);
      results.push(result);
    } catch (err) {
      errors.push({ fileName: file.originalname, error: err.message });
    }
  }

  return { results, errors };
}

module.exports = { processUpload, processMultipleUploads };
