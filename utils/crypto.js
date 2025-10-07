import crypto from 'crypto';

// Secure random generation utilities
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateSecurePassword = (length = 16) => {
  const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const charset = process.env.PASSWORD_CHARSET || defaultCharset;
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

// Generate secure tokens for various purposes
export const generateToken = (length = 32, encoding = 'base64url') => {
  return crypto.randomBytes(length).toString(encoding);
};

export const generateInvitationToken = () => generateToken();
export const generateResetToken = () => generateToken();

export const hashSensitiveData = (data, algorithm = 'sha256') => {
  if (!data) throw new Error('Data is required for hashing');
  return crypto.createHash(algorithm).update(String(data)).digest('hex');
};