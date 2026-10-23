const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const authenticateAdmin = require('../middleware/authenticateAdmin');

// Public route — accessible via share token
router.get('/share/:token', shareController.accessSharedFile);

// Admin-protected share management
router.post('/files/:id/share', authenticateAdmin, shareController.createShare);
router.get('/files/:id/shares', authenticateAdmin, shareController.getFileShares);
router.delete('/shares/:id', authenticateAdmin, shareController.revokeShare);

module.exports = router;
