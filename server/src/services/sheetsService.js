const { readSheet, appendRow, updateCell, deleteRow, findRowIndex, replaceDataRows } = require('../config/googleSheets');

const SHEET_NAME = 'Files';

// Column indices (0-based)
const COL = {
  FILE_ID: 0,
  FILE_NAME: 1,
  MIME_TYPE: 2,
  SIZE_BYTES: 3,
  DRIVE_FILE_ID: 4,
  FOLDER_ID: 5,
  UPLOADED_AT: 6,
  IS_STARRED: 7,
  IS_TRASHED: 8,
};

/**
 * Parse a row array into a file object
 */
function rowToFile(row) {
  const sizeBytes = parseInt(row[COL.SIZE_BYTES] || '0', 10);
  const fileId = row[COL.FILE_ID] || '';
  const fileName = row[COL.FILE_NAME] || '';
  const mimeType = row[COL.MIME_TYPE] || '';
  const uploadedAt = row[COL.UPLOADED_AT] || '';
  const isStarred = String(row[COL.IS_STARRED] || '').toLowerCase() === 'true';
  const isTrashed = String(row[COL.IS_TRASHED] || '').toLowerCase() === 'true';

  const isImage = mimeType.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(fileName);
  const thumbnailLink = isImage ? `/api/v1/files/${fileId}/download?inline=true` : '';

  return {
    file_id: fileId,
    file_name: fileName,
    mime_type: mimeType,
    size_bytes: sizeBytes,
    file_size: sizeBytes,
    thumbnail_link: thumbnailLink,
    drive_file_id: row[COL.DRIVE_FILE_ID] || '',
    folder_id: row[COL.FOLDER_ID] || '',
    uploaded_at: uploadedAt,
    created_at: uploadedAt,
    is_starred: isStarred,
    is_trashed: isTrashed,
  };
}

/**
 * Get all files (optionally filtered)
 */
async function getAllFiles(filters = {}) {
  const rows = await readSheet(SHEET_NAME);
  if (rows.length <= 1) return []; // only header

  let files = rows.slice(1).map(rowToFile);

  if (filters.folder_id !== undefined) {
    files = files.filter((f) => f.folder_id === filters.folder_id);
  }
  if (filters.is_starred !== undefined) {
    files = files.filter((f) => f.is_starred === filters.is_starred);
  }
  if (filters.is_trashed !== undefined) {
    files = files.filter((f) => f.is_trashed === filters.is_trashed);
  } else {
    // Default: exclude trashed files
    files = files.filter((f) => !f.is_trashed);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    files = files.filter((f) => f.file_name.toLowerCase().includes(q));
  }

  // Sort
  if (filters.sort_by) {
    const key = filters.sort_by;
    const dir = filters.sort_order === 'desc' ? -1 : 1;
    files.sort((a, b) => {
      if (key === 'size_bytes') return (a[key] - b[key]) * dir;
      if (key === 'uploaded_at') return (new Date(a[key]) - new Date(b[key])) * dir;
      return String(a[key]).localeCompare(String(b[key])) * dir;
    });
  }

  return files;
}

/**
 * Get a file by ID
 */
async function getFileById(fileId) {
  const rows = await readSheet(SHEET_NAME);
  const row = rows.find((r) => r[COL.FILE_ID] === fileId);
  return row ? rowToFile(row) : null;
}

/**
 * Add a file record
 */
async function addFile(fileData) {
  const values = [
    fileData.file_id,
    fileData.file_name,
    fileData.mime_type,
    String(fileData.size_bytes),
    fileData.drive_file_id,
    fileData.folder_id || '',
    fileData.uploaded_at,
    'false',
    'false',
  ];
  await appendRow(SHEET_NAME, values);
  return rowToFile(values);
}

/**
 * Update file field
 */
async function updateFile(fileId, updates) {
  const rows = await readSheet(SHEET_NAME);
  let rowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][COL.FILE_ID] === fileId) {
      rowIndex = i + 1; // 1-indexed for Sheets
      break;
    }
  }

  if (rowIndex === -1) return null;

  const currentRow = rows[rowIndex - 1];

  if (updates.file_name !== undefined) currentRow[COL.FILE_NAME] = updates.file_name;
  if (updates.mime_type !== undefined) currentRow[COL.MIME_TYPE] = updates.mime_type;
  if (updates.size_bytes !== undefined) currentRow[COL.SIZE_BYTES] = String(updates.size_bytes);
  if (updates.drive_file_id !== undefined) currentRow[COL.DRIVE_FILE_ID] = updates.drive_file_id;
  if (updates.folder_id !== undefined) currentRow[COL.FOLDER_ID] = updates.folder_id;
  if (updates.is_starred !== undefined) currentRow[COL.IS_STARRED] = String(updates.is_starred);
  if (updates.is_trashed !== undefined) currentRow[COL.IS_TRASHED] = String(updates.is_trashed);

  await updateCell(SHEET_NAME, `A${rowIndex}:I${rowIndex}`, currentRow);
  return rowToFile(currentRow);
}

/**
 * Permanently delete a file record
 */
async function deleteFileRecord(fileId) {
  const rows = await readSheet(SHEET_NAME);
  if (!rows || rows.length <= 1) return false;
  const remainingRows = rows.slice(1).filter((r) => r[COL.FILE_ID] !== fileId);
  if (remainingRows.length < rows.length - 1) {
    await replaceDataRows(SHEET_NAME, remainingRows);
    return true;
  }
  const rowIndex = await findRowIndex(SHEET_NAME, COL.FILE_ID, fileId);
  if (rowIndex === -1) return false;
  await deleteRow(SHEET_NAME, rowIndex);
  return true;
}

/**
 * Permanently delete all trashed file records
 */
async function emptyTrashRecords() {
  const rows = await readSheet(SHEET_NAME);
  if (!rows || rows.length <= 1) return 0;
  const nonTrashedRows = rows.slice(1).filter((r) => String(r[COL.IS_TRASHED] || '').toLowerCase() !== 'true');
  const removedCount = (rows.length - 1) - nonTrashedRows.length;
  await replaceDataRows(SHEET_NAME, nonTrashedRows);
  return removedCount;
}

/**
 * Get recently uploaded files
 */
async function getRecentFiles(limit = 20) {
  const files = await getAllFiles({ is_trashed: false });
  files.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  return files.slice(0, limit);
}

module.exports = {
  getAllFiles,
  getFileById,
  addFile,
  updateFile,
  deleteFileRecord,
  emptyTrashRecords,
  getRecentFiles,
};
