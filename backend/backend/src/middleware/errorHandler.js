const errorHandler = (err, req, res, next) => {
  // Statuses from body-parser / CORS / multer already say what went wrong. A bad id or a failed
  // schema validation is the caller's mistake, not a server fault.
  let statusCode = err.statusCode || err.status || 500;
  if (err.name === 'CastError' || err.name === 'ValidationError') statusCode = 400;

  // Log the failure server-side (never the request body: it can hold passwords and tokens).
  if (statusCode >= 500) console.error('Error:', err.stack || err);
  else console.warn(`Rejected request: ${req.method} ${String(req.path).slice(0, 120)} -> ${statusCode} ${err.message}`);

  const isDev = process.env.NODE_ENV === 'development';
  // Internal errors and driver/schema messages can reveal field names and queries: outside
  // development the client only gets a short, generic sentence for those.
  let message = err.message || 'Internal Server Error';
  if (!isDev) {
    if (statusCode >= 500) message = 'Internal Server Error';
    else if (err.name === 'CastError') message = 'Invalid identifier';
    else if (err.name === 'ValidationError') message = 'Invalid input';
    else if (err.type === 'entity.parse.failed') message = 'Malformed request body';
  }

  if (res.headersSent) return next(err);
  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
