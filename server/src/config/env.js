const path = require('path');
const dotenv = require('dotenv');

try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  dotenv.config();
} catch (e) {}

function cleanId(val) {
  if (!val) return val;
  const sheetMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch) return sheetMatch[1];
  const folderMatch = val.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (folderMatch) return folderMatch[1];
  return val.split('/')[0].split('?')[0].split('#')[0].trim();
}

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminPasswordHash:
    process.env.ADMIN_PASSWORD_HASH ||
    '$2a$10$qS0INoAz8ocSRYAdL1Gbuuf19WcNjgx4o/MybmSroScwFNmmwlSKu',
  sessionSecret: process.env.SESSION_SECRET || 'drivex-dev-secret-change-me',
  google: {
    spreadsheetId: cleanId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined,
    driveFolderId: cleanId(process.env.GOOGLE_DRIVE_FOLDER_ID),
  },
};

module.exports = config;
