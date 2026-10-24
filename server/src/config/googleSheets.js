const { google } = require('googleapis');
const config = require('./env');

let sheetsClient = null;
let initialized = false;

const REQUIRED_SHEETS = {
  Files: [
    ['file_id', 'file_name', 'mime_type', 'size_bytes', 'drive_file_id', 'folder_id', 'uploaded_at', 'is_starred', 'is_trashed']
  ],
  Folders: [
    ['folder_id', 'folder_name', 'parent_folder_id', 'created_at', 'drive_folder_id']
  ],
  Shares: [
    ['share_id', 'file_id', 'token_hash', 'permission', 'expires_at', 'status']
  ],
  Activity: [
    ['activity_id', 'action', 'file_id', 'timestamp']
  ],
  FileData: [
    ['file_id', 'chunk_index', 'chunk_data']
  ]
};

/**
 * Get authenticated Google Sheets client
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.JWT(
    config.google.serviceAccountEmail,
    null,
    config.google.privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  await auth.authorize();
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Automatically ensure Files, Folders, and Shares sheets exist with headers
 */
async function ensureSheetsInitialized() {
  if (initialized) return;
  const sheets = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: config.google.spreadsheetId,
  });

  const existingTitles = (spreadsheet.data.sheets || []).map(
    (s) => s.properties.title
  );

  for (const [title, headers] of Object.entries(REQUIRED_SHEETS)) {
    if (!existingTitles.includes(title)) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: config.google.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title } } }],
          },
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: config.google.spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: headers },
        });
      } catch (e) {
        // Continue if sheet was created concurrently
      }
    }
  }
  initialized = true;
}

const SHEET_CACHE_TTL = 5000; // 5 seconds in-memory cache
const sheetCache = new Map();
const sheetIdCache = new Map();

function invalidateSheetCache(sheetName) {
  sheetCache.delete(sheetName);
}

/**
 * Timeout helper to avoid infinite hanging requests
 */
function withTimeout(promise, timeoutMs = 15000, errorMsg = 'Google Sheets request timed out') {
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutHandle));
}

/**
 * Read rows from a worksheet with TTL cache
 */
async function readSheet(sheetName, range = '') {
  // Check in-memory cache if reading full sheet
  if (!range) {
    const cached = sheetCache.get(sheetName);
    if (cached && Date.now() - cached.timestamp < SHEET_CACHE_TTL) {
      return cached.data.map((r) => [...r]);
    }
  }

  const sheets = await getSheetsClient();
  const fullRange = range ? `${sheetName}!${range}` : sheetName;

  try {
    const response = await withTimeout(
      sheets.spreadsheets.values.get({
        spreadsheetId: config.google.spreadsheetId,
        range: fullRange,
      }),
      15000,
      `Timed out reading sheet: ${sheetName}`
    );

    const values = response.data.values || [];
    if (!range) {
      sheetCache.set(sheetName, { data: values, timestamp: Date.now() });
    }
    return values.map((r) => [...r]);
  } catch (err) {
    if (err.message && err.message.includes('Unable to parse range')) {
      await ensureSheetsInitialized();
      const retryResponse = await withTimeout(
        sheets.spreadsheets.values.get({
          spreadsheetId: config.google.spreadsheetId,
          range: fullRange,
        }),
        15000,
        `Timed out retrying read sheet: ${sheetName}`
      );
      const values = retryResponse.data.values || [];
      if (!range) {
        sheetCache.set(sheetName, { data: values, timestamp: Date.now() });
      }
      return values.map((r) => [...r]);
    }
    throw err;
  }
}

/**
 * Append a row to a worksheet (invalidates cache)
 */
async function appendRow(sheetName, values) {
  invalidateSheetCache(sheetName);
  const sheets = await getSheetsClient();

  try {
    const response = await withTimeout(
      sheets.spreadsheets.values.append({
        spreadsheetId: config.google.spreadsheetId,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [values],
        },
      }),
      15000,
      `Timed out appending to sheet: ${sheetName}`
    );

    return response.data;
  } catch (err) {
    if (err.message && err.message.includes('Unable to parse range')) {
      await ensureSheetsInitialized();
      return appendRow(sheetName, values);
    }
    throw err;
  }
}

/**
 * Append multiple rows in a single batch (RAW mode for high-speed binary chunks)
 */
async function appendMultipleRows(sheetName, rows) {
  if (!rows || rows.length === 0) return;
  invalidateSheetCache(sheetName);
  const sheets = await getSheetsClient();

  try {
    const response = await withTimeout(
      sheets.spreadsheets.values.append({
        spreadsheetId: config.google.spreadsheetId,
        range: sheetName,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows,
        },
      }),
      30000,
      `Timed out appending multiple rows to sheet: ${sheetName}`
    );

    return response.data;
  } catch (err) {
    if (err.message && err.message.includes('Unable to parse range')) {
      await ensureSheetsInitialized();
      return appendMultipleRows(sheetName, rows);
    }
    throw err;
  }
}

/**
 * Update a specific cell range (invalidates cache)
 */
async function updateCell(sheetName, range, values) {
  invalidateSheetCache(sheetName);
  const sheets = await getSheetsClient();

  const response = await withTimeout(
    sheets.spreadsheets.values.update({
      spreadsheetId: config.google.spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: Array.isArray(values[0]) ? values : [values],
      },
    }),
    15000,
    `Timed out updating sheet: ${sheetName}`
  );

  return response.data;
}

/**
 * Delete a row by row number (1-indexed) (invalidates cache)
 */
async function deleteRow(sheetName, rowIndex) {
  invalidateSheetCache(sheetName);
  const sheets = await getSheetsClient();

  let sheetId = sheetIdCache.get(sheetName);
  if (sheetId === undefined) {
    const spreadsheet = await withTimeout(
      sheets.spreadsheets.get({
        spreadsheetId: config.google.spreadsheetId,
      }),
      15000,
      'Timed out fetching spreadsheet metadata'
    );

    for (const s of spreadsheet.data.sheets || []) {
      if (s.properties?.title) {
        sheetIdCache.set(s.properties.title, s.properties.sheetId);
      }
    }
    sheetId = sheetIdCache.get(sheetName);
  }

  if (sheetId === undefined) throw new Error(`Sheet "${sheetName}" not found`);

  await withTimeout(
    sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.google.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-indexed
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    }),
    15000,
    `Timed out deleting row from sheet: ${sheetName}`
  );
}

/**
 * Find a row index by matching a column value (1-indexed, header is row 1)
 */
async function findRowIndex(sheetName, columnIndex, value) {
  const rows = await readSheet(sheetName);
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][columnIndex] === value) {
      return i + 1; // 1-indexed (row 1 is header)
    }
  }
  return -1;
}

/**
 * Replace all data rows in a worksheet (preserving row 1 headers)
 */
async function replaceDataRows(sheetName, newRows) {
  invalidateSheetCache(sheetName);
  const sheets = await getSheetsClient();

  // 1. Clear rows from A2 onwards
  try {
    await withTimeout(
      sheets.spreadsheets.values.clear({
        spreadsheetId: config.google.spreadsheetId,
        range: `${sheetName}!A2:Z`,
      }),
      15000,
      `Timed out clearing ${sheetName}`
    );
  } catch (clearErr) {
    console.warn(`Clear sheet notice for ${sheetName}:`, clearErr.message);
  }

  // 2. If new rows exist, write them back starting at A2
  if (newRows && newRows.length > 0) {
    await withTimeout(
      sheets.spreadsheets.values.update({
        spreadsheetId: config.google.spreadsheetId,
        range: `${sheetName}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: newRows,
        },
      }),
      15000,
      `Timed out updating rows in ${sheetName}`
    );
  }
}

module.exports = {
  getSheetsClient,
  ensureSheetsInitialized,
  readSheet,
  appendRow,
  updateCell,
  deleteRow,
  findRowIndex,
  replaceDataRows,
  appendMultipleRows,
};
