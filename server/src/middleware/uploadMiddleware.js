const multer = require('multer');
const AppError = require('../utils/AppError');

// Store files in memory for streaming to Google Drive
const storage = multer.memoryStorage();

// 100MB max file size
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types — validation can be extended here
    cb(null, true);
  },
});

// Error handling wrapper
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 100MB.', 413));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 10 at once.', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
}

module.exports = { upload, handleMulterError };
