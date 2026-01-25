const multer = require('multer');
const { ZodError } = require('zod');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';
  let details;

  if (err instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
      status = 413;
      code = 'UPLOAD_LIMIT';
    } else {
      status = 400;
      code = 'UPLOAD_ERROR';
    }
    message = err.message;
  }


  if (err.code === 'INVALID_FILE_TYPE') {
    status = 400;
    code = 'INVALID_FILE_TYPE';
    message = err.message || 'Invalid file type';
  }

  const requestId = req.requestId;
  const logPayload = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    code,
    message,
  };

  if (details) {
    logPayload.details = details;
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[archive-error]', logPayload);
    if (err?.stack) {
      // eslint-disable-next-line no-console
      console.error(err.stack);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[archive-error]', logPayload);
  }

  res.status(status).json({
    error: {
      message,
      code,
    },
    ...(details ? { details } : {}),
  });
};

module.exports = errorHandler;
