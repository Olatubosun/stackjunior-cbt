exports.errorHandler = (err, req, res, next) => {
  console.error('--- ERROR ---');
  console.error('name:    ', err.name);
  console.error('message: ', err.message);
  if (err.original) {
    console.error('sql:     ', err.original.sqlMessage);
    console.error('code:    ', err.original.code);
  }
  if (err.errors) {
    console.error('details: ', err.errors.map(e => `${e.path}: ${e.message}`));
  }
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || err.original?.sqlMessage || 'Internal server error',
    details: err.errors?.map(e => ({ field: e.path, message: e.message })),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
