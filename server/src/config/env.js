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

const DEFAULT_SPREADSHEET_ID = '1GVwmTrEmTieGHl9KVIxFDZ-ONCJPgWhvm_jclcFv7bM';
const DEFAULT_SERVICE_ACCOUNT_EMAIL = 'cloud-769@colo-512309.iam.gserviceaccount.com';
const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCDAEivX9JvOZS
1CCmHrlRuJQr3pE7RSf8pmxgjyh/Kz0jGt8VYtTrmA+a/KU2Yc8H285XnX6yJWe6
GgTklrjoHpvZiP5yGdosHg1UxPbHwVSEgVWXZR7I/W/Tn3fvA8lXMSsEVpeQDJ51
iCLFYdx40ARalKaLMked50T1ZICNXJKabaAsia1Jz7Qcduw3lnRBu0a5pc663lRq
8wwxEKPls1h8RG3Cs/GXMc3AG0S9K+MhC2KsN6qi8RVKDwUzYdJwuv3dv9wvBjH0
e+pEW1WcNe3Izagc+5LkodRKao5ZjCmpU6jI2DGzmNB1dAg2+mZruYzwfrYupqDT
VnUCXiiFAgMBAAECggEASWx9aYXGikI97I1zpSfu+2saNddLoN+0F7dpPsgsjKHx
yjy6uL7izhqFnSGH6iHsUo7rbt+bNxFMRHDf9RbK9JnQYumhTc9WbGcaqD63GjKf
JlxB5L1QfsDW9X5bxUbrgmCKZGPXiZwcwWA3t/QlllkvrI6ezgDCdI8z2p6ivdnl
VUBoIZN4THXa8ycEtdbWmUvD1aw4PWazTTGhms0zBTznGR2nRIl6e5XciAOpIIeN
+AEU+3R4BFZ3AfD5U8TyLbW72uTzd/gLGQfRmxbtisYsOZIl5kodre1ZpQXmA9Ry
+wZRgSzpLjXYogr9yu3yP5eWtQhRMwpc8qRUrMeSKQKBgQD9fwDA7OfrMNqFE4fd
4ZzW491Y5vzMYlofYSS9mMNrvet+xEZO36JooWOS6jfzzmAjJ17R34tB1V/oHp7V
7X94qxUwtH2d3pKjGPKhkrY36C6oCrTbuffCjiXSYLaRogPdXBVi1ooBj4E/kDij
8fBhSYCBupD2tHpz2IWFv2K7dwKBgQDD9q02xUhrsPVFvGrAp1QFzAOTvyCzILgQ
k7zaKbrF9Ape/mlGEpxFadZSejbM1RqtdasHDxmYYrb8z4TMOPTZy9e1k3Us5kUS
LlIRWd6sQIMp6c1m0g2ppS3yPPSvAUx50BGb0mbbejhS5OfQpUweeNvMtNBDC6JL
22YtSz0C4wKBgBGNi8XQIbb9aQQx+AR7LNsMaDVRuUuFu+vUVDD0tQNu4TGj8aJg
heRs2HJB2aH+NlX40e4CZqgmWD/AbwstKNh4MD1xIgmecdTtU0+w0wFICIMGSsO0
Ot2z7haFL98hstbPG4P+iwvUngSCvglMJXL3HfjdrFAI6zm+UnCScgm9AoGBAIys
We/Fc5WLNKdY+LFP7Ss0JyU6wPiV9kxAIgPijOdppsBGlb/twCy8K1SN0yT7nekD
XUD2AAO6aW3WcphAEtT+Vd1M+4K90ruYcOVvxD+XGBFQe1jiVViA8RjB1UyD/Cg9
y0Y2pgvMEv6+wAKxhpEhZXfwHMjkYx9dYl4FcsjNAoGBAKGcRSiNrGPqRj3mAJI4
XJqFL+TDg+/tWbF4x6hwBNpikuUwxexRoKojUqI8QcIeM4H+msJCfq2bUrJlSAsS
PFHxc7+QKdVQk3ZrGgWHSztUNXDfNt+YpS5vOlPRYjncPjGTlzFs524GQuYgaQbp
VaPBXeRtZqysc5tZKt9/yRk+
-----END PRIVATE KEY-----`;

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: cleanString(process.env.CLIENT_URL) || 'http://localhost:5173',
  adminPasswordHash:
    cleanString(process.env.ADMIN_PASSWORD_HASH) ||
    '$2a$10$qS0INoAz8ocSRYAdL1Gbuuf19WcNjgx4o/MybmSroScwFNmmwlSKu',
  sessionSecret: cleanString(process.env.SESSION_SECRET) || 'drivex-dev-secret-change-me',
  google: {
    spreadsheetId: cleanId(process.env.GOOGLE_SHEETS_SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID,
    serviceAccountEmail: cleanString(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) || DEFAULT_SERVICE_ACCOUNT_EMAIL,
    privateKey: cleanPrivateKey(process.env.GOOGLE_PRIVATE_KEY) || cleanPrivateKey(DEFAULT_PRIVATE_KEY),
    driveFolderId: cleanId(process.env.GOOGLE_DRIVE_FOLDER_ID) || undefined,
  },
};

module.exports = config;
