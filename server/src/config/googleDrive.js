const fs = require('fs');
const stream = require('stream');
const { google } = require('googleapis');
const config = require('./env');

let driveClient = null;

/**
 * Get authenticated Google Drive client
 */
async function getDriveClient() {
  if (driveClient) return driveClient;

  const auth = new google.auth.JWT(
    config.google.serviceAccountEmail,
    null,
    config.google.privateKey,
    ['https://www.googleapis.com/auth/drive']
  );

  await auth.authorize();
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function resolveTargetFolder(folderId) {
  const validDriveFolderId =
    config.google.driveFolderId &&
    config.google.driveFolderId !== 'your_drive_folder_id'
      ? config.google.driveFolderId
      : null;

  const targetFolder = folderId || validDriveFolderId;
  if (!targetFolder) {
    throw new Error(
      'GOOGLE_DRIVE_FOLDER_ID is not configured. Create a Drive folder, share it with the service account as Editor, and set GOOGLE_DRIVE_FOLDER_ID.'
    );
  }
  return targetFolder;
}

/**
 * Upload from a Buffer (small files / legacy)
 */
async function uploadFile(fileBuffer, fileName, mimeType, folderId = null) {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);
  return uploadFromStream(bufferStream, fileName, mimeType, folderId, fileBuffer.length);
}

/**
 * Upload from a disk path — streams to Drive (resumable for large files)
 */
async function uploadFileFromPath(filePath, fileName, mimeType, folderId = null) {
  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);
  return uploadFromStream(fileStream, fileName, mimeType, folderId, stat.size);
}

/**
 * Core stream upload. googleapis uses resumable upload for streams automatically.
 */
async function uploadFromStream(bodyStream, fileName, mimeType, folderId, knownSize) {
  const drive = await getDriveClient();
  const targetFolder = resolveTargetFolder(folderId);

  const requestBody = {
    name: fileName,
    parents: [targetFolder],
  };

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body: bodyStream,
  };

  // Prefer resumable for anything over ~5MB
  const useResumable = !knownSize || knownSize > 5 * 1024 * 1024;

  const response = await drive.files.create(
    {
      requestBody,
      media,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
      supportsAllDrives: true,
    },
    useResumable
      ? {
          // Force resumable protocol for reliability on large files
        }
      : undefined
  );

  return response.data;
}

/**
 * Download a file stream from Google Drive
 */
async function downloadFile(fileId) {
  const drive = await getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );

  return response.data;
}

/**
 * Get file metadata from Google Drive
 */
async function getFileMetadata(fileId) {
  const drive = await getDriveClient();

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
    supportsAllDrives: true,
  });

  return response.data;
}

/**
 * Delete file from Google Drive
 */
async function deleteFile(fileId) {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

/**
 * Create a folder in Google Drive
 */
async function createFolder(folderName, parentId = null) {
  const drive = await getDriveClient();
  const validDriveFolderId =
    config.google.driveFolderId &&
    config.google.driveFolderId !== 'your_drive_folder_id'
      ? config.google.driveFolderId
      : null;

  const targetParent = parentId || validDriveFolderId;

  const requestBody = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (targetParent) {
    requestBody.parents = [targetParent];
  }

  const response = await drive.files.create({
    requestBody,
    fields: 'id, name',
    supportsAllDrives: true,
  });

  return response.data;
}

/**
 * Get storage usage for the service account
 */
async function getStorageUsage() {
  const drive = await getDriveClient();

  const response = await drive.about.get({
    fields: 'storageQuota',
  });

  return response.data.storageQuota;
}

/**
 * Generate a temporary public URL (make file readable)
 */
async function makeFilePublic(fileId) {
  const drive = await getDriveClient();

  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  });

  const file = await drive.files.get({
    fileId,
    fields: 'webViewLink, webContentLink',
    supportsAllDrives: true,
  });

  return file.data;
}

/**
 * Remove public access from a file
 */
async function revokePublicAccess(fileId) {
  const drive = await getDriveClient();

  const permissions = await drive.permissions.list({ fileId, supportsAllDrives: true });
  const anyonePermission = (permissions.data.permissions || []).find(
    (p) => p.type === 'anyone'
  );

  if (anyonePermission) {
    await drive.permissions.delete({
      fileId,
      permissionId: anyonePermission.id,
      supportsAllDrives: true,
    });
  }
}

/**
 * Rename a file in Google Drive
 */
async function renameDriveFile(fileId, newName) {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.update({
      fileId,
      requestBody: { name: newName },
      fields: 'id, name',
      supportsAllDrives: true,
    });
    return response.data;
  } catch (err) {
    console.warn('Google Drive rename notice:', err.message);
    return null;
  }
}

/**
 * Move a file between folders in Google Drive
 */
async function moveDriveFile(fileId, newParentId, oldParentId = null) {
  try {
    const drive = await getDriveClient();

    let removeParents = oldParentId;
    if (!removeParents) {
      const meta = await drive.files.get({
        fileId,
        fields: 'parents',
        supportsAllDrives: true,
      });
      removeParents = (meta.data.parents || []).join(',');
    }

    const updateParams = {
      fileId,
      addParents: newParentId,
      fields: 'id, parents',
      supportsAllDrives: true,
    };
    if (removeParents) {
      updateParams.removeParents = removeParents;
    }
    const response = await drive.files.update(updateParams);
    return response.data;
  } catch (err) {
    console.warn('Google Drive move notice:', err.message);
    return null;
  }
}

module.exports = {
  getDriveClient,
  uploadFile,
  uploadFileFromPath,
  downloadFile,
  getFileMetadata,
  deleteFile,
  createFolder,
  getStorageUsage,
  makeFilePublic,
  revokePublicAccess,
  renameDriveFile,
  moveDriveFile,
};
