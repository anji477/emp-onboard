import path from 'path';
import crypto from 'crypto';

// Allowed file types with MIME validation
const ALLOWED_TYPES = {
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  },
  training: {
    extensions: ['.pdf', '.doc', '.docx', '.mp4', '.webm', '.avi', '.mov'],
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'video/mp4', 'video/webm', 'video/x-msvideo', 'video/quicktime']
  },
  policies: {
    extensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx'],
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
  },
  excel: {
    extensions: ['.xlsx', '.xls'],
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  }
};

export const validateFileType = (file, category = 'documents') => {
  const allowedTypes = ALLOWED_TYPES[category];
  if (!allowedTypes) return false;
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  
  return allowedTypes.extensions.includes(ext) && allowedTypes.mimes.includes(mime);
};

export const sanitizeFilename = (filename) => {
  // Remove path traversal attempts and dangerous characters
  const sanitized = filename
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .trim();
  
  // Generate secure filename with timestamp and random suffix
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext).substring(0, 50);
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  
  return `${name}-${timestamp}-${random}${ext}`;
};

export const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => {
  return size <= maxSize;
};

export const createSecureUploadPath = (baseDir, filename) => {
  const sanitizedFilename = sanitizeFilename(filename);
  const securePath = path.join(baseDir, sanitizedFilename);
  
  // Ensure path is within upload directory
  const resolvedPath = path.resolve(securePath);
  const resolvedBase = path.resolve(baseDir);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Invalid file path');
  }
  
  return { path: securePath, filename: sanitizedFilename };
};