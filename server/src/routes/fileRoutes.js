const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authenticateAdmin = require('../middleware/authenticateAdmin');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

// All file routes require admin auth
router.use(authenticateAdmin);

router.get('/', fileController.listFiles);
router.get('/recent', fileController.getRecentFiles);
router.post('/upload', upload.array('files', 10), handleMulterError, fileController.uploadFiles);
router.post('/:id/reupload', upload.single('file'), handleMulterError, fileController.reuploadFile);
router.get('/:id/preview', fileController.previewFile);
router.get('/:id/download', fileController.downloadFile);
router.patch('/:id/rename', fileController.renameFile);
router.patch('/:id/move', fileController.moveFile);
router.patch('/:id/star', fileController.toggleStar);
router.patch('/:id/restore', fileController.restoreFile);
router.delete('/trash/empty', fileController.emptyTrash);
router.delete('/:id/permanent', fileController.permanentDelete);
router.delete('/:id', fileController.trashFile);

module.exports = router;
