const fs = require('fs');
const mongoose = require('mongoose');
const { z } = require('zod');
const asyncHandler = require('../utils/asyncHandler');
const { percent } = require('../utils/bytes');
const {
  archiveFiles,
  cleanupTempFolder,
  resolveArchivePath,
  maybeOptimizeFiles,
} = require('../services/file.service');
const {
  createArchiveRecord,
  getArchiveById,
  listByClient,
  deleteArchiveById,
} = require('../services/archive.service');

const clientIdSchema = z
  .string()
  .trim()
  .min(1, 'clientId is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'clientId must be alphanumeric, dash, or underscore');

const validateClientId = (clientId) => {
  const parsed = clientIdSchema.parse(clientId);
  return parsed;
};

const validateClientIdParam = (req, res, next) => {
  try {
    req.params.clientId = validateClientId(req.params.clientId);
    return next();
  } catch (error) {
    return next(error);
  }
};

const validateArchiveId = (archiveId) => {
  if (!mongoose.Types.ObjectId.isValid(archiveId)) {
    const error = new Error('Invalid archiveId');
    error.status = 400;
    error.code = 'INVALID_ARCHIVE_ID';
    throw error;
  }
  return archiveId;
};

const uploadArchive = asyncHandler(async (req, res) => {
  const clientId = validateClientId(req.params.clientId);
  const files = req.files || [];
  const requestId = req.requestId;

  if (!files.length) {
    // eslint-disable-next-line no-console
    console.warn('[archive-upload] no files', { requestId, clientId });
    const error = new Error('No files uploaded');
    error.status = 400;
    error.code = 'NO_FILES';
    throw error;
  }

  const startTime = Date.now();
  const archiveId = new mongoose.Types.ObjectId();
  const totalOriginalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);

  // eslint-disable-next-line no-console
  console.info('[archive-upload] start', {
    requestId,
    clientId,
    fileCount: files.length,
    totalOriginalBytes,
  });

  const originalFiles = files.map((file) => ({
    originalName: file.originalname,
    storedName: file.filename,
    bytes: file.size,
    mimetype: file.mimetype,
  }));

  let archiveResult;
  try {
    const filesToArchive = await maybeOptimizeFiles(files, clientId, req.requestId);
    archiveResult = await archiveFiles({ clientId, archiveId, files: filesToArchive });

    const record = await createArchiveRecord({
      archiveId,
      clientId,
      archivePath: archiveResult.archivePath,
      totalOriginalBytes,
      archivedBytes: archiveResult.archivedBytes,
      originalFiles,
    });

    const savingsBytes = totalOriginalBytes - archiveResult.archivedBytes;
    const savingsPercent = percent(savingsBytes, totalOriginalBytes);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const archiveDownloadUrl = `${baseUrl}/api/archives/${record.archiveId}/download`;

    // eslint-disable-next-line no-console
    console.info('[archive-upload] success', {
      requestId,
      clientId,
      archiveId: record.archiveId,
      fileCount: files.length,
      totalOriginalBytes,
      archivedBytes: archiveResult.archivedBytes,
      durationMs: Date.now() - startTime,
    });

    return res.status(201).json({
      clientId,
      archiveId: record.archiveId,
      fileCount: files.length,
      totalOriginalBytes,
      archivedBytes: archiveResult.archivedBytes,
      savingsBytes,
      savingsPercent,
      archiveDownloadUrl,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[archive-upload] failed', {
      requestId,
      clientId,
      fileCount: files.length,
      totalOriginalBytes,
      durationMs: Date.now() - startTime,
      error: error?.message || String(error),
      code: error?.code,
    });
    throw error;
  } finally {
    await cleanupTempFolder(clientId, req.requestId);
  }
});

const getArchive = asyncHandler(async (req, res) => {
  const archiveId = validateArchiveId(req.params.archiveId);
  const record = await getArchiveById(archiveId);
  if (!record) {
    const error = new Error('Archive not found');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  res.json(record);
});

const listClientArchives = asyncHandler(async (req, res) => {
  const clientId = validateClientId(req.params.clientId);
  const records = await listByClient(clientId);
  res.json(records);
});

const downloadArchive = asyncHandler(async (req, res, next) => {
  const archiveId = validateArchiveId(req.params.archiveId);
  const record = await getArchiveById(archiveId);

  if (!record) {
    const error = new Error('Archive not found');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const absoluteArchivePath = resolveArchivePath(record.archivePath);

  if (!fs.existsSync(absoluteArchivePath)) {
    const error = new Error('Archive file missing on disk');
    error.status = 404;
    error.code = 'FILE_MISSING';
    throw error;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${record.archiveId}.zip"`
  );

  const stream = fs.createReadStream(absoluteArchivePath);
  stream.on('error', next);
  stream.pipe(res);
});

const deleteArchive = asyncHandler(async (req, res) => {
  const archiveId = validateArchiveId(req.params.archiveId);
  const record = await getArchiveById(archiveId);

  if (!record) {
    const error = new Error('Archive not found');
    error.status = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const absoluteArchivePath = resolveArchivePath(record.archivePath);
  if (fs.existsSync(absoluteArchivePath)) {
    await fs.promises.rm(absoluteArchivePath, { force: true });
  }

  await deleteArchiveById(archiveId);

  res.status(204).send();
});

module.exports = {
  uploadArchive,
  getArchive,
  listClientArchives,
  downloadArchive,
  deleteArchive,
  validateClientIdParam,
};
