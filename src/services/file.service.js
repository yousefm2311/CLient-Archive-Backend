const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const multer = require('multer');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');


const maxFilesConfigured = Number(process.env.MAX_FILES || 30);
const MAX_FILES =
  Number.isFinite(maxFilesConfigured) && maxFilesConfigured > 0
    ? maxFilesConfigured
    : 30;

const maxFileSizeMbConfigured = Number(process.env.MAX_FILE_SIZE_MB || 50);
const MAX_FILE_SIZE_BYTES =
  (Number.isFinite(maxFileSizeMbConfigured) && maxFileSizeMbConfigured > 0
    ? maxFileSizeMbConfigured
    : 50) *
  1024 *
  1024; // default 50MB per file

const tempBaseDir = process.env.UPLOAD_TEMP_DIR || "D:/client-documents/temp";

const archiveBaseDir =
  process.env.UPLOAD_ARCHIVE_DIR || "D:/client-documents/archives";
const tempBaseAbsolute = path.resolve(tempBaseDir);
const archiveBaseAbsolute = path.resolve(archiveBaseDir);

const enablePdfOptimization =
  String(process.env.PDF_OPTIMIZE || '').toLowerCase() === 'true';
const ghostscriptPath = process.env.PDF_GS_PATH || 'gs';
const pdfGsPreset = (process.env.PDF_GS_PRESET || 'screen').replace('/', '').toLowerCase();
const pdfGsColorDpi = Number(process.env.PDF_GS_COLOR_DPI || 96);
const pdfGsGrayDpi = Number(process.env.PDF_GS_GRAY_DPI || 96);
const pdfGsMonoDpi = Number(process.env.PDF_GS_MONO_DPI || 300);

const ensureWithinBase = (base, targetPath) => {
  const normalized = path.normalize(targetPath);
  if (!normalized.startsWith(base + path.sep)) {
    throw Object.assign(new Error('Invalid path resolution'), {
      code: 'INVALID_PATH',
      status: 400,
    });
  }
  return normalized;
};

const withUploadContext = (req, res, next) => {
  if (!req.requestId) {
    req.requestId = uuidv4();
  }
  next();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = req.params?.clientId;
    if (!clientId || typeof clientId !== 'string') {
      const error = new Error('clientId is required in path');
      error.code = 'INVALID_CLIENT_ID';
      return cb(error);
    }
    const requestId = req.requestId || uuidv4();
    req.requestId = requestId;

    let destinationPath;
    try {
      destinationPath = ensureWithinBase(
        tempBaseAbsolute,
        path.join(tempBaseAbsolute, clientId, requestId)
      );
    } catch (err) {
      return cb(err);
    }

    fs.mkdir(destinationPath, { recursive: true }, (err) => {
      cb(err, destinationPath);
    });
  },
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname);
    const uniqueName = `${Date.now()}-${safeName.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isPdf =
    file.mimetype === 'application/pdf' && ext === '.pdf';

  if (!isPdf) {
    const error = new Error('Only PDF files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error);
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES,
  },
});

const buildGhostscriptArgs = (inputPath, outputPath) => {
  const args = [
    '-sDEVICE=pdfwrite',
    '-dCompatibilityLevel=1.4',
    `-dPDFSETTINGS=/${pdfGsPreset || 'screen'}`,
    '-dNOPAUSE',
    '-dQUIET',
    '-dBATCH',
  ];

  if (Number.isFinite(pdfGsColorDpi) && pdfGsColorDpi > 0) {
    args.push('-dColorImageDownsampleType=/Average', `-dColorImageResolution=${pdfGsColorDpi}`);
  }
  if (Number.isFinite(pdfGsGrayDpi) && pdfGsGrayDpi > 0) {
    args.push('-dGrayImageDownsampleType=/Average', `-dGrayImageResolution=${pdfGsGrayDpi}`);
  }
  if (Number.isFinite(pdfGsMonoDpi) && pdfGsMonoDpi > 0) {
    args.push('-dMonoImageDownsampleType=/Subsample', `-dMonoImageResolution=${pdfGsMonoDpi}`);
  }

  args.push(`-sOutputFile=${outputPath}`, inputPath);
  return args;
};

const optimizePdf = async (inputPath, outputPath) =>
  new Promise((resolve, reject) => {
    const args = buildGhostscriptArgs(inputPath, outputPath);

    const proc = spawn(ghostscriptPath, args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve(outputPath);
      const err = new Error(`Ghostscript exited with code ${code}`);
      return reject(err);
    });
  });

const maybeOptimizeFiles = async (files, clientId, requestId) => {
  if (!enablePdfOptimization || !files?.length) return files;

  const safeRequestId = requestId || uuidv4();
  const optimizedDir = ensureWithinBase(
    tempBaseAbsolute,
    path.join(tempBaseAbsolute, clientId, safeRequestId, 'optimized')
  );

  await fsp.mkdir(optimizedDir, { recursive: true });

  const optimized = await Promise.all(
    files.map(async (file) => {
      const destPath = path.join(optimizedDir, file.filename || path.basename(file.path));
      try {
        await optimizePdf(file.path, destPath);
        return { ...file, archivePath: destPath };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[pdf-optimize] fallback to original for ${file.originalname}: ${err.message}`);
        return { ...file };
      }
    })
  );

  return optimized;
};

const archiveFiles = async ({ clientId, archiveId, files }) => {
  if (!files || !files.length) {
    throw Object.assign(new Error('No files to archive'), {
      code: 'NO_FILES',
      status: 400,
    });
  }

  const clientArchiveDir = path.join(archiveBaseAbsolute, clientId);
  await fsp.mkdir(clientArchiveDir, { recursive: true });

  const archiveFileName = `${archiveId}.zip`;
  const archiveFullPath = ensureWithinBase(
    archiveBaseAbsolute,
    path.join(clientArchiveDir, archiveFileName)
  );

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archiveFullPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const relativePath = path
        .relative(process.cwd(), archiveFullPath)
        .replace(/\\/g, '/');
      resolve({
        archivePath: relativePath,
        archivedBytes: output.bytesWritten,
      });
    });

    output.on('error', (err) => reject(err));
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    files.forEach((file) => {
      const sourcePath = file.archivePath || file.path;
      archive.file(sourcePath, { name: path.basename(file.originalname) });
    });

    archive.finalize();
  });
};

const cleanupTempFolder = async (clientId, requestId) => {
  if (!clientId || !requestId) return;
  const tempFolder = ensureWithinBase(
    tempBaseAbsolute,
    path.join(tempBaseAbsolute, clientId, requestId)
  );
  try {
    await fsp.rm(tempFolder, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  } catch (err) {
    if (err?.code === 'EBUSY') {
      // eslint-disable-next-line no-console
      console.warn(`[cleanup] temp folder busy, skipping: ${tempFolder}`);
      return;
    }
    throw err;
  }
};

const resolveArchivePath = (storedPath) => {
  const absolute = path.resolve(process.cwd(), storedPath);
  return ensureWithinBase(archiveBaseAbsolute, absolute);
};

module.exports = {
  upload,
  withUploadContext,
  archiveFiles,
  cleanupTempFolder,
  resolveArchivePath,
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  maybeOptimizeFiles,
};
