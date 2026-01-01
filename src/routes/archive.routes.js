const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const {
  uploadArchive,
  getArchive,
  listClientArchives,
  downloadArchive,
  deleteArchive,
  validateClientIdParam,
} = require('../controllers/archive.controller');
const {
  upload,
  withUploadContext,
  MAX_FILES,
} = require('../services/file.service');

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: {
        message: 'Too many upload attempts, please try again later.',
        code: 'RATE_LIMITED',
      },
    }),
});

router.get('/client/:clientId', listClientArchives);
router.get('/:archiveId/download', downloadArchive);
router.get('/:archiveId', getArchive);

router.post(
  '/:clientId/upload',
  uploadLimiter,
  validateClientIdParam,
  withUploadContext,
  upload.array('files', MAX_FILES),
  uploadArchive
);

router.delete('/:archiveId', deleteArchive);

module.exports = router;
