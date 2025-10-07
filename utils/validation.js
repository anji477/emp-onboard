import validator from 'validator';

// Input validation utilities
export const validateEmail = (email) => {
  return validator.isEmail(email) && email.length <= 255;
};

export const validatePassword = (password) => {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
  const maxLength = parseInt(process.env.PASSWORD_MAX_LENGTH) || 128;
  const requireUpper = process.env.PASSWORD_REQUIRE_UPPER !== 'false';
  const requireLower = process.env.PASSWORD_REQUIRE_LOWER !== 'false';
  const requireNumber = process.env.PASSWORD_REQUIRE_NUMBER !== 'false';
  
  return typeof password === 'string' && 
         password.length >= minLength && 
         password.length <= maxLength &&
         (!requireUpper || /[A-Z]/.test(password)) &&
         (!requireLower || /[a-z]/.test(password)) &&
         (!requireNumber || /[0-9]/.test(password));
};

export const validateString = (str, minLength = 1, maxLength = 255) => {
  return typeof str === 'string' && 
         str.trim().length >= minLength && 
         str.length <= maxLength;
};

export const validateInteger = (num, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = parseInt(num, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
};

export const validateEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
};

export const validateUserInput = (data) => {
  const errors = [];
  
  if (data.name && !validateString(data.name, 2, 100)) {
    errors.push('Name must be 2-100 characters');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.password && !validatePassword(data.password)) {
    errors.push('Password must be 8-128 characters with uppercase, lowercase, and number');
  }
  
  const allowedRoles = process.env.ALLOWED_ROLES ? process.env.ALLOWED_ROLES.split(',') : ['Employee', 'Admin', 'HR'];
  if (data.role && !validateEnum(data.role, allowedRoles)) {
    errors.push('Invalid role');
  }
  
  return errors;
};