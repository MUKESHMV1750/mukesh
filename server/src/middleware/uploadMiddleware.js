const multer = require('multer');
const AppError = require('../utils/AppError');
const uploadsDir = require('../utils/uploadsDir');
const { generateId } = require('../utils/generateToken');
const sanitizeFilename = require('../utils/sanitizeFilename');

const fs = require('fs');

/** 350 MB max per file */
const MAX_FILE_SIZE = 350 * 1024 * 1024;
const MAX_FILES = 10;

// Disk storage avoids holding up to 350MB × N files in RAM
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch (e) {}
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safe = sanitizeFilename(file.originalname);
    cb(null, `tmp_${Date.now()}_${generateId()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    // Preserve original name (UTF-8) for metadata; multer may latin1-decode
    try {
      if (file.originalname) {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      }
    } catch (e) {
      // keep original
    }
    file.originalname = sanitizeFilename(file.originalname);
    cb(null, true);
  },
});

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 350MB.', 413));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 10 at once.', 400));
    }
    return next(new AppError(err.message, 400));
  }
  next(err);
}

module.exports = {
  upload,
  handleMulterError,
  MAX_FILE_SIZE,
};
