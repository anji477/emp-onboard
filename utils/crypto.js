import crypto from 'crypto';

// Secure random generation utilities
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateSecurePassword = (length = 16) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

export const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString('base64url');
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('base64url');
};

export const hashSensitiveData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};