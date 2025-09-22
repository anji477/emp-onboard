const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images, PDFs, and Word documents are allowed'));
        }
    }
});

// Upload document
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { userId, documentName } = req.body;
        if (!userId || !documentName) {
            return res.status(400).json({ error: 'User ID and document name are required' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;
        
        // Insert or update document in database
        const query = `
            INSERT INTO user_documents (user_id, name, status, file_url, file_name, file_size, file_type, uploaded_at)
            VALUES (?, ?, 'Uploaded', ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            status = 'Uploaded',
            file_url = VALUES(file_url),
            file_name = VALUES(file_name),
            file_size = VALUES(file_size),
            file_type = VALUES(file_type),
            uploaded_at = NOW(),
            action_date = CURDATE()
        `;
        
        await req.db.execute(query, [
            userId,
            documentName,
            fileUrl,
            req.file.originalname,
            req.file.size,
            req.file.mimetype
        ]);

        res.json({
            message: 'Document uploaded successfully',
            document: {
                name: documentName,
                fileName: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype,
                url: fileUrl
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Get user documents
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT id, name, status, action_date, rejection_reason, file_url, file_name, file_size, file_type
            FROM user_documents 
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
        `;
        
        const [rows] = await req.db.execute(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

module.exports = router;