const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authenticateAdmin = require('../middleware/authenticateAdmin');

router.use(authenticateAdmin);

router.post('/', folderController.createFolder);
router.get('/', folderController.listFolders);
router.patch('/:id', folderController.renameFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
