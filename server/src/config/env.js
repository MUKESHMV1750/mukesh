const path = require('path');
const dotenv = require('dotenv');

try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  dotenv.config();
} catch (e) {}

function cleanId(val) {
  if (!val || typeof val !== 'string') return val;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  const sheetMatch = cleaned.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch) return sheetMatch[1];
  const folderMatch = cleaned.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (folderMatch) return folderMatch[1];
  return cleaned.split('/')[0].split('?')[0].split('#')[0].trim();
}

function cleanString(val) {
  if (!val || typeof val !== 'string') return val;
  let cleaned = val.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

function cleanPrivateKey(key) {
  if (!key || typeof key !== 'string') return undefined;
  let cleaned = key.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r/g, '');
}

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: cleanString(process.env.CLIENT_URL) || 'http://localhost:5173',
  adminPasswordHash:
    cleanString(process.env.ADMIN_PASSWORD_HASH) ||
    '$2a$10$qS0INoAz8ocSRYAdL1Gbuuf19WcNjgx4o/MybmSroScwFNmmwlSKu',
  sessionSecret: cleanString(process.env.SESSION_SECRET) || 'drivex-dev-secret-change-me',
  google: {
    spreadsheetId: cleanId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
    serviceAccountEmail: cleanString(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    privateKey: cleanPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    driveFolderId: cleanId(process.env.GOOGLE_DRIVE_FOLDER_ID),
  },
};

module.exports = config;
