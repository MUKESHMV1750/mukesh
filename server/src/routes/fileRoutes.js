const fs = require('fs');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authenticateAdmin = require('../middleware/authenticateAdmin');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

// Public file stream & preview routes (accessible by unguessable UUID for browser iframes, audio/video tags, and direct downloads)
router.get('/:id/preview', fileController.previewFile);
router.get('/:id/download', fileController.downloadFile);

// All mutating & listing file routes require admin auth
router.use(authenticateAdmin);

/** Clean multer temp files only when multer itself rejects the upload */
function cleanupMulterTemps(err, req, res, next) {
  if (err instanceof multer.MulterError || err?.statusCode === 413) {
    const temps = [];
    if (req.file?.path) temps.push(req.file.path);
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f?.path) temps.push(f.path);
      }
    }
    for (const p of temps) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (e) {}
    }
  }
  return handleMulterError(err, req, res, next);
}

router.get('/', fileController.listFiles);
router.get('/recent', fileController.getRecentFiles);
router.post('/upload', upload.array('files', 10), cleanupMulterTemps, fileController.uploadFiles);
router.post('/:id/reupload', upload.single('file'), cleanupMulterTemps, fileController.reuploadFile);
router.patch('/:id/rename', fileController.renameFile);
router.patch('/:id/move', fileController.moveFile);
router.patch('/:id/star', fileController.toggleStar);
router.patch('/:id/restore', fileController.restoreFile);
router.delete('/trash/empty', fileController.emptyTrash);
router.delete('/:id/permanent', fileController.permanentDelete);
router.delete('/:id', fileController.trashFile);

module.exports = router;
