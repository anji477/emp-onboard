import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set');
}

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' } // Extended for MFA setup
  );
};

export const verifyToken = async (req, res, next) => {
  // Check for session-based authentication first
  if (req.session?.userId) {
    try {
      const [users] = await req.db.execute('SELECT * FROM users WHERE id = ?', [req.session.userId]);
      if (users[0]) {
        req.user = users[0];
        return next();
      }
    } catch (error) {
      console.error('Session user lookup failed:', error);
    }
  }
  
  // If user has logged out, block JWT fallback
  if (req.session && (req.session.loggedOut || req.cookies.sessionId)) {
    return res.status(401).json({ message: 'Access denied. Please log in.' });
  }
  
  // Fallback to JWT token only if no session exists
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    // Check if token is blacklisted
    if (req.tokenBlacklist && await req.tokenBlacklist.isBlacklisted(token)) {
      return res.status(401).json({ message: 'Token has been invalidated. Please log in again.' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    res.status(401).json({ message: 'Invalid token.' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
    }
    next();
  };
};