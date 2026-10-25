const googleDrive = require('../config/googleDrive');

/**
 * Upload file to Google Drive and return metadata
 * Accepts Buffer or absolute disk path (preferred for large files)
 */
async function uploadToDrive(source, fileName, mimeType, driveFolderId) {
  if (typeof source === 'string') {
    return googleDrive.uploadFileFromPath(
      source,
      fileName,
      mimeType,
      driveFolderId || undefined
    );
  }
  return googleDrive.uploadFile(
    source,
    fileName,
    mimeType,
    driveFolderId || undefined
  );
}

/**
 * Download a file stream from Google Drive
 */
async function downloadFromDrive(driveFileId) {
  return await googleDrive.downloadFile(driveFileId);
}

/**
 * Get file info from Google Drive
 */
async function getFileInfo(driveFileId) {
  return await googleDrive.getFileMetadata(driveFileId);
}

/**
 * Delete file from Google Drive
 */
async function removeFromDrive(driveFileId) {
  await googleDrive.deleteFile(driveFileId);
}

/**
 * Create a folder in Google Drive
 */
async function createDriveFolder(folderName, parentId) {
  return await googleDrive.createFolder(folderName, parentId);
}

let cachedStorageInfo = null;
let lastStorageFetchTime = 0;
const STORAGE_CACHE_TTL = 60000; // 60 seconds

/**
 * Get storage quota info
 */
async function getStorageInfo() {
  if (cachedStorageInfo && Date.now() - lastStorageFetchTime < STORAGE_CACHE_TTL) {
    return cachedStorageInfo;
  }

  try {
    const quota = await googleDrive.getStorageUsage();
    const total = parseInt(quota?.limit || '16106127360', 10);
    const used = parseInt(quota?.usage || '0', 10);
    const available = Math.max(0, total - used);
    const percentage = total > 0 ? Number(((used / total) * 100).toFixed(2)) : 0;

    cachedStorageInfo = {
      total,
      used,
      available,
      percentage,
      limit: total,
      usage: used,
    };
    lastStorageFetchTime = Date.now();
    return cachedStorageInfo;
  } catch (err) {
    if (cachedStorageInfo) return cachedStorageInfo;
    return {
      total: 16106127360,
      used: 0,
      available: 16106127360,
      percentage: 0,
      limit: 16106127360,
      usage: 0,
    };
  }
}

async function renameDriveFile(driveFileId, newName) {
  return await googleDrive.renameDriveFile(driveFileId, newName);
}

async function moveDriveFile(driveFileId, newParentId, oldParentId) {
  return await googleDrive.moveDriveFile(driveFileId, newParentId, oldParentId);
}

module.exports = {
  uploadToDrive,
  downloadFromDrive,
  getFileInfo,
  removeFromDrive,
  createDriveFolder,
  getStorageInfo,
  renameDriveFile,
  moveDriveFile,
};
