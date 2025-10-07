import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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

// Get all documents (for HR/Admin)
router.get('/all', async (req, res) => {
    try {
        const query = `
            SELECT 
                ud.id,
                ud.name,
                ud.status,
                ud.action_date,
                ud.rejection_reason,
                ud.file_url,
                ud.file_name,
                ud.file_size,
                ud.file_type,
                ud.uploaded_at,
                ud.user_id as user_id,
                u.name as user_name,
                u.email as user_email,
                'Medium' as priority
            FROM user_documents ud
            LEFT JOIN users u ON ud.user_id = u.id
            ORDER BY ud.uploaded_at DESC
        `;
        
        const [rows] = await req.db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching all documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// Get document analytics/stats
router.get('/analytics', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'Uploaded' THEN 1 ELSE 0 END) as uploaded,
                SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verified,
                SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'Overdue' THEN 1 ELSE 0 END) as overdue
            FROM user_documents
        `;
        
        const [rows] = await req.db.execute(query);
        res.json({ stats: rows[0] });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get document categories
router.get('/categories', async (req, res) => {
    try {
        const query = `
            SELECT id, name, description, color
            FROM task_categories 
            WHERE is_active = 1
            ORDER BY name
        `;
        
        const [rows] = await req.db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get document templates (placeholder)
router.get('/templates', async (req, res) => {
    try {
        // For now, return some default templates
        const templates = [
            { id: '1', name: 'ID Document', description: 'Government issued ID', priority: 'High', dueInDays: 7, category: 'Paperwork' },
            { id: '2', name: 'Tax Forms', description: 'Tax documentation', priority: 'Medium', dueInDays: 14, category: 'Paperwork' },
            { id: '3', name: 'Emergency Contact', description: 'Emergency contact information', priority: 'High', dueInDays: 3, category: 'HR' }
        ];
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Assign document template to users
router.post('/assign', async (req, res) => {
    try {
        const { documentName, userIds, priority, dueInDays } = req.body;
        
        if (!documentName || !userIds || userIds.length === 0) {
            return res.status(400).json({ error: 'Document name and user IDs are required' });
        }

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (dueInDays || 7));

        // Insert document assignments for each user
        const query = `
            INSERT INTO user_documents (user_id, name, status, priority, due_date, created_at)
            VALUES (?, ?, 'Pending', ?, ?, NOW())
        `;

        for (const userId of userIds) {
            await req.db.execute(query, [userId, documentName, priority || 'Medium', dueDate]);
        }

        res.json({ 
            message: `Document "${documentName}" assigned to ${userIds.length} users`,
            assignedCount: userIds.length
        });
    } catch (error) {
        console.error('Error assigning documents:', error);
        res.status(500).json({ error: 'Failed to assign documents' });
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

export default router;