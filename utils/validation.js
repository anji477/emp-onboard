import validator from 'validator';

// Input validation utilities
export const validateEmail = (email) => {
  return validator.isEmail(email) && email.length <= 255;
};

export const validatePassword = (password) => {
  return typeof password === 'string' && 
         password.length >= 8 && 
         password.length <= 128 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password);
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
  
  if (data.role && !validateEnum(data.role, ['Employee', 'Admin', 'HR'])) {
    errors.push('Invalid role');
  }
  
  return errors;
};