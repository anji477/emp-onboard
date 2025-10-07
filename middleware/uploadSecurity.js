import { validateFileType, validateFileSize } from '../utils/fileValidation.js';

// Additional upload security middleware
export const validateUploadSecurity = (req, res, next) => {
  // Check if file exists
  if (!req.file && !req.files) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const files = req.files ? Object.values(req.files).flat() : [req.file];
  
  for (const file of files) {
    // Double-check file size (in case multer limits are bypassed)
    if (!validateFileSize(file.size, 50 * 1024 * 1024)) {
      return res.status(400).json({ error: 'File too large' });
    }
    
    // Validate file headers (magic bytes)
    if (!validateFileHeaders(file)) {
      return res.status(400).json({ error: 'Invalid file format' });
    }
  }
  
  next();
};

const validateFileHeaders = (file) => {
  if (!file.buffer) return true; // Skip if no buffer available
  
  const buffer = file.buffer;
  const header = buffer.toString('hex', 0, 8).toUpperCase();
  
  // Common file signatures
  const signatures = {
    'PDF': '25504446',
    'DOC': 'D0CF11E0A1B11AE1',
    'DOCX': '504B0304',
    'MP4': '00000018667479706D703432',
    'AVI': '52494646',
    'XLSX': '504B0304'
  };
  
  // Check if header matches any known signature
  return Object.values(signatures).some(sig => 
    header.startsWith(sig) || header.includes(sig)
  );
};

export const sanitizeUploadPath = (req, res, next) => {
  if (req.file) {
    // Ensure filename doesn't contain path traversal
    req.file.originalname = req.file.originalname.replace(/[\/\\:*?"<>|]/g, '');
    req.file.filename = req.file.filename.replace(/[\/\\:*?"<>|]/g, '');
  }
  
  if (req.files) {
    Object.values(req.files).flat().forEach(file => {
      file.originalname = file.originalname.replace(/[\/\\:*?"<>|]/g, '');
      file.filename = file.filename.replace(/[\/\\:*?"<>|]/g, '');
    });
  }
  
  next();
};