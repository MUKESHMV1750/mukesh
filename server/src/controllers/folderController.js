const { readSheet, appendRow, updateCell, deleteRow, findRowIndex } = require('../config/googleSheets');
const driveService = require('../services/driveService');
const sheetsService = require('../services/sheetsService');
const AppError = require('../utils/AppError');
const { generateId } = require('../utils/generateToken');

const SHEET_NAME = 'Folders';

const COL = {
  FOLDER_ID: 0,
  FOLDER_NAME: 1,
  PARENT_FOLDER_ID: 2,
  CREATED_AT: 3,
  DRIVE_FOLDER_ID: 4,
};

function rowToFolder(row) {
  return {
    folder_id: row[COL.FOLDER_ID] || '',
    folder_name: row[COL.FOLDER_NAME] || '',
    parent_folder_id: row[COL.PARENT_FOLDER_ID] || '',
    created_at: row[COL.CREATED_AT] || '',
    drive_folder_id: row[COL.DRIVE_FOLDER_ID] || '',
  };
}

/**
 * POST /api/v1/folders
 */
async function createFolder(req, res, next) {
  try {
    const { name, parent_folder_id } = req.body;
    if (!name) throw new AppError('Folder name is required', 400);

    // Look up parent folder's drive_folder_id if parent_folder_id is provided
    let parentDriveFolderId = null;
    if (parent_folder_id) {
      try {
        const rows = await readSheet(SHEET_NAME);
        const parentRow = rows.slice(1).find((r) => r[COL.FOLDER_ID] === parent_folder_id);
        if (parentRow && parentRow[COL.DRIVE_FOLDER_ID]) {
          parentDriveFolderId = parentRow[COL.DRIVE_FOLDER_ID];
        }
      } catch (readErr) {
        console.warn('Could not read parent folder from sheets:', readErr.message);
      }
    }

    // Create in Google Drive with graceful fallback
    let driveFolderId = '';
    try {
      const driveFolder = await driveService.createDriveFolder(name, parentDriveFolderId || undefined);
      if (driveFolder && driveFolder.id) {
        driveFolderId = driveFolder.id;
      }
    } catch (driveErr) {
      console.warn('Google Drive folder creation notice:', driveErr.message);
    }

    const folderId = generateId();
    const values = [
      folderId,
      name,
      parent_folder_id || '',
      new Date().toISOString(),
      driveFolderId,
    ];

    await appendRow(SHEET_NAME, values);

    res.status(201).json({
      success: true,
      data: rowToFolder(values),
      message: 'Folder created successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/folders
 */
async function listFolders(req, res, next) {
  try {
    const { parent_id } = req.query;
    const rows = await readSheet(SHEET_NAME);

    let folders = rows.slice(1).map(rowToFolder);

    if (parent_id !== undefined) {
      folders = folders.filter((f) => f.parent_folder_id === parent_id);
    }

    res.json({ success: true, data: folders, count: folders.length });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/folders/:id
 */
async function renameFolder(req, res, next) {
  try {
    const { name } = req.body;
    if (!name) throw new AppError('New folder name is required', 400);

    const rows = await readSheet(SHEET_NAME);
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][COL.FOLDER_ID] === req.params.id) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) throw new AppError('Folder not found', 404);

    const currentRow = rows[rowIndex - 1];
    currentRow[COL.FOLDER_NAME] = name;

    await updateCell(SHEET_NAME, `A${rowIndex}:E${rowIndex}`, currentRow);

    res.json({
      success: true,
      data: rowToFolder(currentRow),
      message: 'Folder renamed successfully',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/folders/:id
 */
async function deleteFolder(req, res, next) {
  try {
    const rows = await readSheet(SHEET_NAME);
    let rowIndex = -1;
    let driveFolderId = null;

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][COL.FOLDER_ID] === req.params.id) {
        rowIndex = i + 1;
        driveFolderId = rows[i][COL.DRIVE_FOLDER_ID];
        break;
      }
    }

    if (rowIndex === -1) throw new AppError('Folder not found', 404);

    // Delete folder row from sheet
    await deleteRow(SHEET_NAME, rowIndex);

    // If folder had a drive ID, remove from Drive
    if (driveFolderId) {
      try {
        await driveService.removeFromDrive(driveFolderId);
      } catch (e) {
        console.warn('Drive folder removal notice:', e.message);
      }
    }

    // Move any files in this folder to trash so they show up in Trash view
    try {
      const folderFiles = await sheetsService.getAllFiles({ folder_id: req.params.id, is_trashed: false });
      for (const f of folderFiles) {
        await sheetsService.updateFile(f.file_id, { is_trashed: true });
      }
    } catch (fErr) {
      console.warn('Notice trashing files in deleted folder:', fErr.message);
    }

    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createFolder, listFolders, renameFolder, deleteFolder };
