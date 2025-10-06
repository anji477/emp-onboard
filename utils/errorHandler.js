// Secure error handling utilities
export const sanitizeError = (error) => {
  const sensitivePatterns = [
    /password/gi,
    /secret/gi,
    /token/gi,
    /key/gi,
    /auth/gi,
    /credential/gi,
    /hash/gi
  ];
  
  let message = error.message || 'Internal server error';
  
  // Remove sensitive information
  sensitivePatterns.forEach(pattern => {
    message = message.replace(pattern, '[REDACTED]');
  });
  
  // Remove file paths and stack traces in production
  if (process.env.NODE_ENV === 'production') {
    message = message.replace(/\/.*?:/g, '[PATH]:');
    message = message.split('\n')[0]; // Only first line
  }
  
  return {
    message,
    code: error.code || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString()
  };
};

export const logError = (error, context = '') => {
  const sanitized = sanitizeError(error);
  console.error(`[ERROR] ${context}:`, sanitized);
};

export const handleDatabaseError = (error, res, operation = 'database operation') => {
  logError(error, operation);
  
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Resource already exists' });
  }
  if (error.code === 'ER_NO_SUCH_TABLE') {
    return res.status(500).json({ message: 'Database configuration error' });
  }
  if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({ message: 'Database access error' });
  }
  
  res.status(500).json({ message: 'Database operation failed' });
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const globalErrorHandler = (err, req, res, next) => {
  logError(err, `${req.method} ${req.path}`);
  
  if (res.headersSent) {
    return next(err);
  }
  
  const sanitized = sanitizeError(err);
  res.status(err.status || 500).json({
    message: sanitized.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};