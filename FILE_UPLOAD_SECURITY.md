# File Upload Security Implementation

## Overview
Comprehensive file upload security has been implemented to prevent path traversal, file type bypass, and unrestricted uploads.

## Security Features

### 1. Path Traversal Prevention
- Filename sanitization removes dangerous characters (`/\:*?"<>|`)
- Path traversal sequences (`../`) are stripped
- Secure filename generation with timestamp and random suffix
- Path validation ensures files stay within upload directory

### 2. File Type Validation
- **Extension Validation**: Whitelist of allowed extensions per category
- **MIME Type Validation**: Strict MIME type checking
- **Magic Byte Validation**: File header verification for common formats
- **Double Validation**: Both extension and MIME must match

### 3. File Size Limits
- **Global Limit**: 50MB maximum file size
- **Category Limits**: Excel files limited to 10MB
- **Multer Limits**: Additional limits on file count and fields
- **Double Validation**: Size checked in multer and middleware

### 4. Secure File Categories

#### Documents
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.txt`
- **MIME Types**: `application/pdf`, `application/msword`, etc.

#### Training Materials
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.mp4`, `.webm`, `.avi`, `.mov`
- **MIME Types**: Document and video types

#### Policies
- **Extensions**: `.pdf`, `.doc`, `.docx`, `.ppt`, `.pptx`
- **MIME Types**: Document and presentation types

#### Excel Files
- **Extensions**: `.xlsx`, `.xls`
- **MIME Types**: Excel spreadsheet types

## Implementation

### File Validation Utilities
```javascript
import { validateFileType, sanitizeFilename, validateFileSize } from './utils/fileValidation.js';

// Validate file type
if (!validateFileType(file, 'documents')) {
  throw new Error('Invalid file type');
}

// Sanitize filename
const secureFilename = sanitizeFilename(file.originalname);

// Validate file size
if (!validateFileSize(file.size, 50 * 1024 * 1024)) {
  throw new Error('File too large');
}
```

### Security Middleware
- **sanitizeUploadPath**: Removes dangerous characters from filenames
- **validateUploadSecurity**: Additional validation layer
- **File Header Validation**: Magic byte verification

### Protected Upload Endpoints
- `/api/training/upload` - Training materials
- `/api/documents/upload` - User documents
- `/api/policies/upload` - Policy documents
- `/api/employees/bulk-upload` - Excel employee data
- `/api/documents/templates/upload` - Document templates
- `/api/documents/company/upload` - Company documents

## Security Benefits
- **Path Traversal**: Prevented by filename sanitization and path validation
- **File Type Bypass**: Multiple validation layers prevent bypass attempts
- **Unrestricted Upload**: Size limits and file count restrictions
- **Malicious Files**: Magic byte validation detects file type spoofing
- **Directory Traversal**: Secure path creation ensures containment