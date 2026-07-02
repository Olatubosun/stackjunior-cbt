// Turn a raw Sequelize/validation error into a readable field message.
const humanize = (msg = '') =>
  msg
    .replace(/^\w+\./, '')                         // drop "Question." model prefix
    .replace(/(.+) cannot be null/i, '$1 is required')
    .replace(/^./, (c) => c.toUpperCase());

exports.errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const name = err.name || '';

  // Map common causes to sensible status codes (default 500).
  let statusCode = err.statusCode || 500;
  if (name === 'SequelizeValidationError' || name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
  } else if (name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
  }

  const details = err.errors?.map((e) => ({ field: e.path, message: humanize(e.message) }));

  let message;
  if (statusCode >= 500) {
    message = 'Something went wrong on our end. Please try again.';
  } else if (details?.length) {
    message = details.map((d) => d.message).join('; ');
  } else {
    message = err.message || 'Request failed.';
  }

  // Log server errors in full; client (4xx) errors are expected — one line.
  if (statusCode >= 500) {
    console.error('--- ERROR ---', err.name, '|', err.message);
    if (err.original) console.error('sql:', err.original.sqlMessage, '|', err.original.code);
    console.error(err.stack);
  } else {
    console.warn(`[${statusCode}] ${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(statusCode).json({
    error: message,
    ...(details?.length && { details }),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};
