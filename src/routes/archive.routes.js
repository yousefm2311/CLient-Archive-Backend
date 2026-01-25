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

const getRateLimitKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const forwardedIp = forwardedValue ? forwardedValue.split(",")[0].trim() : "";
  const clientCode = req.headers["x-client-code"];
  return forwardedIp || clientCode || req.ip;
};

const uploadLimiter = rateLimit({
  windowMs: Number(process.env.UPLOAD_RATE_WINDOW_MS || 10 * 60 * 1000), // 10 minutes
  max: Number(process.env.UPLOAD_RATE_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getRateLimitKey,
  handler: (req, res) =>
    res.status(429).json({
      error: {
        message: 'Too many upload attempts, please try again later.',
        code: 'RATE_LIMITED',
      },
    }),
});

router.get('/health', (req, res) =>
  res.status(200).json({
    ok: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
);

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
