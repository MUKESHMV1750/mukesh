const os = require('os');
const path = require('path');
const fs = require('fs');

// In serverless environments like Vercel or AWS Lambda, the root filesystem is read-only.
// Only the /tmp directory is writable.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsDir = isServerless
  ? path.join(os.tmpdir(), 'drivex-uploads')
  : path.resolve(__dirname, '../../uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  // Gracefully avoid crashing cold starts in read-only environments
  console.warn('Uploads directory initialization notice:', err.message);
}

module.exports = uploadsDir;
