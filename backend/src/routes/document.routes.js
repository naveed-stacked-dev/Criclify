const router = require('express').Router();
const documentController = require('../controllers/document.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { clubManagerOnly } = require('../middlewares/role.middleware');
const { handleDocumentUpload } = require('../middlewares/upload.middleware');

// Public — list documents for a club
router.get('/:clubId', documentController.getDocuments);

// Protected — create/delete
router.post('/', authenticate, clubManagerOnly, handleDocumentUpload, documentController.createDocument);
router.delete('/:id', authenticate, clubManagerOnly, documentController.deleteDocument);

module.exports = router;
