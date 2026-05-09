const router = require('express').Router();
const contentController = require('../controllers/content.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { clubManagerOnly } = require('../middlewares/role.middleware');
const { handleUpload } = require('../middlewares/upload.middleware');

// Public routes — get content for a specific club
router.get('/:clubId/sponsors', contentController.getSponsors);
router.get('/:clubId/posts', contentController.getPosts);
router.get('/:clubId/gallery', contentController.getGallery);

// Protected routes — Admin / Club Manager
router.post('/sponsors', authenticate, clubManagerOnly, handleUpload, contentController.createSponsor);
router.put('/sponsors/:id', authenticate, clubManagerOnly, handleUpload, contentController.updateSponsor);
router.delete('/sponsors/:id', authenticate, clubManagerOnly, contentController.deleteSponsor);

router.post('/posts', authenticate, clubManagerOnly, handleUpload, contentController.createPost);
router.put('/posts/:id', authenticate, clubManagerOnly, handleUpload, contentController.updatePost);
router.delete('/posts/:id', authenticate, clubManagerOnly, contentController.deletePost);

router.post('/gallery', authenticate, clubManagerOnly, handleUpload, contentController.createGalleryImage);
router.delete('/gallery/:id', authenticate, clubManagerOnly, contentController.deleteGalleryImage);

module.exports = router;
