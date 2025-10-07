import crypto from 'crypto';

export const verifyCsrfToken = (req, res, next) => {
  // Skip CSRF for GET requests and public endpoints
  if (req.method === 'GET' || 
      req.path === '/api/login' || 
      req.path === '/api/csrf-token' ||
      req.path === '/api/logout' ||
      req.path.startsWith('/api/verify-token') || 
      req.path === '/api/setup-password' || 
      req.path === '/api/forgot-password' || 
      req.path === '/api/reset-password' ||
      req.path === '/api/maintenance-status' ||
      req.path.startsWith('/api/mfa/') ||
      req.path.startsWith('/api/chat/') ||
      req.path === '/api/users/invite' ||
      req.path === '/api/documents/upload' ||
      req.path.startsWith('/api/employees/') ||
      req.path.startsWith('/api/documents/') && req.method === 'POST' && req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token) {
    return res.status(403).json({ message: 'CSRF token missing' });
  }
  
  // Check if session exists
  if (!req.session) {
    return res.status(403).json({ message: 'No session found' });
  }
  
  // Get CSRF token from session
  const sessionToken = req.session.data?.csrfToken;
  
  if (!sessionToken) {
    return res.status(403).json({ message: 'No CSRF token in session' });
  }
  
  if (sessionToken !== token) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  
  next();
};

export const getCsrfToken = async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  
  // Store CSRF token in session - create session if needed
  if (req.session) {
    if (!req.session.data) {
      req.session.data = {};
    }
    req.session.data.csrfToken = token;
    await req.session.save();
  }
  
  res.json({ csrfToken: token });
};