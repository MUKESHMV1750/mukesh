const { google } = require('googleapis');
const config = require('./env');
const stream = require('stream');

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

/**
 * Upload a file to Google Drive
 */
async function uploadFile(fileBuffer, fileName, mimeType, folderId = null) {
  const drive = await getDriveClient();
  const validDriveFolderId =
    config.google.driveFolderId &&
    config.google.driveFolderId !== 'your_drive_folder_id'
      ? config.google.driveFolderId
      : null;

  const targetFolder = folderId || validDriveFolderId;

  if (!targetFolder) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured in server/.env. Please create a folder in your Google Drive, share it with your service account as Editor, and put its ID in server/.env.');
  }

  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  const requestBody = {
    name: fileName,
    parents: [targetFolder],
  };

  const response = await drive.files.create({
    requestBody,
    media: {
      mimeType: mimeType,
      body: bufferStream,
    },
    fields: 'id, name, mimeType, size, webViewLink, webContentLink',
  });

  return response.data;
}

/**
 * Download a file from Google Drive
 */
async function downloadFile(fileId) {
  const drive = await getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: 'media' },
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
  });

  return response.data;
}

/**
 * Delete a file from Google Drive
 */
async function deleteFile(fileId) {
  const drive = await getDriveClient();
  await drive.files.delete({ fileId });
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
  });

  const file = await drive.files.get({
    fileId,
    fields: 'webViewLink, webContentLink',
  });

  return file.data;
}

/**
 * Remove public access from a file
 */
async function revokePublicAccess(fileId) {
  const drive = await getDriveClient();

  const permissions = await drive.permissions.list({ fileId });
  const anyonePermission = permissions.data.permissions.find(
    (p) => p.type === 'anyone'
  );

  if (anyonePermission) {
    await drive.permissions.delete({
      fileId,
      permissionId: anyonePermission.id,
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
    const updateParams = {
      fileId,
      addParents: newParentId,
      fields: 'id, parents',
    };
    if (oldParentId) {
      updateParams.removeParents = oldParentId;
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
