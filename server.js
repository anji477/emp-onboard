// server.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import fs from 'fs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import db from './db-mysql.js'; // Import our database connection
import { generateToken, verifyToken, requireRole } from './middleware/auth.js';
import { safeJsonParse } from './utils/safeJson.js';
import { verifyCsrfToken, getCsrfToken } from './middleware/csrf.js';
import { sessionMiddleware, initSessionStore } from './middleware/session.js';
import TokenBlacklist from './services/tokenBlacklist.js';
import { asyncHandler, handleDatabaseError, globalErrorHandler, logError } from './utils/errorHandler.js';
import { validateFileType, sanitizeFilename, validateFileSize } from './utils/fileValidation.js';
import { validateUploadSecurity, sanitizeUploadPath } from './middleware/uploadSecurity.js';
import { validateUserInput, validateEmail, validateString, validateInteger } from './utils/validation.js';
import { generateSecureToken, generateInvitationToken, generateResetToken } from './utils/crypto.js';
import { filterUserResponse, filterUsersResponse, removeDebugInfo } from './utils/responseFilter.js';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors({ 
  credentials: true, 
  origin: ['http://localhost:5173', 'http://192.168.1.140:5173'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token']
})); // Allow requests from localhost and server IP
app.use(express.json({ limit: '50mb' })); // Allow the server to understand JSON data with larger payload limit
app.use(cookieParser()); // Parse cookies
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
app.use(express.static('.')); // Serve static files from current directory
// Serve uploaded files with proper headers
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    } else if (path.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (path.endsWith('.doc')) {
      res.setHeader('Content-Type', 'application/msword');
    } else if (path.endsWith('.docx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else if (path.endsWith('.ppt')) {
      res.setHeader('Content-Type', 'application/vnd.ms-powerpoint');
    } else if (path.endsWith('.pptx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    }
  }
}));

// Add database connection to all requests
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Initialize session store and token blacklist
const sessionStore = initSessionStore(db);
const tokenBlacklist = new TokenBlacklist(db);

// Session middleware
app.use(sessionMiddleware);

// Add token blacklist to requests
app.use((req, res, next) => {
  req.tokenBlacklist = tokenBlacklist;
  next();
});

// CSRF protection for state-changing requests
app.use(verifyCsrfToken);

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);



// Create uploads directory
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure secure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        try {
            const secureFilename = sanitizeFilename(file.originalname);
            cb(null, secureFilename);
        } catch (error) {
            cb(error);
        }
    }
});

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 50 * 1024 * 1024, // 50MB max
        files: 1,
        fields: 10
    },
    fileFilter: (req, file, cb) => {
        // Validate file size
        if (!validateFileSize(file.size, 50 * 1024 * 1024)) {
            return cb(new Error('File too large'));
        }
        
        // Determine file category and validate
        let category = 'documents';
        if (file.fieldname === 'trainingFile') category = 'training';
        else if (file.fieldname === 'policyFile') category = 'policies';
        else if (file.fieldname === 'employeeFile') category = 'excel';
        
        if (!validateFileType(file, category)) {
            return cb(new Error('Invalid file type'));
        }
        
        cb(null, true);
    }
});

// --- Define API Endpoints Here ---

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// Test database connection
app.get('/api/test', asyncHandler(async (req, res) => {
  try {
    const [result] = await db.execute('SELECT 1 as test');
    const [users] = await db.execute('SELECT id, name, email FROM users');
    const [tasks] = await db.execute('SELECT * FROM tasks');
    const [assignments] = await db.execute('SELECT * FROM user_assignments');
    res.json({ message: 'Database connected successfully', result, users, tasks, assignments });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ message: 'Database server unavailable. Please start MySQL service.' });
    }
    throw error;
  }
}));

// GET all tasks for current user (or all tasks if Admin/HR)
app.get('/api/tasks', verifyToken, asyncHandler(async (req, res) => {
  let tasks;
  if (req.user.role === 'Admin' || req.user.role === 'HR') {
    const [allTasks] = await db.execute('SELECT * FROM tasks ORDER BY id DESC');
    tasks = allTasks;
  } else {
    const [userTasks] = await db.execute('SELECT * FROM tasks WHERE user_id = ?', [req.user.id]);
    tasks = userTasks;
  }
  res.json(tasks);
}));

// GET tasks for a specific user
app.get('/api/users/:userId/tasks', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const [tasks] = await db.execute('SELECT * FROM tasks WHERE user_id = ?', [userId]);
    res.json(tasks);
  } catch (error) {
    return handleDatabaseError(error, res, 'task fetch');
  }
});

// GET comprehensive onboarding progress for a user
app.get('/api/users/:userId/progress', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get tasks progress (direct tasks + assigned tasks)
    const [directTasks] = await db.execute('SELECT status FROM tasks WHERE user_id = ?', [userId]);
    const [assignedTasks] = await db.execute('SELECT status FROM user_assignments WHERE user_id = ? AND item_type = "task"', [userId]);
    
    const tasksTotal = directTasks.length + assignedTasks.length;
    const directCompleted = directTasks.filter(task => 
      task.status === 'Completed' || task.status === 'InProgress'
    ).length;
    const assignedCompleted = assignedTasks.filter(task => task.status === 'completed').length;
    const tasksCompleted = directCompleted + assignedCompleted;
    
    // Get documents progress
    const [allDocs] = await db.execute('SELECT status FROM user_documents WHERE user_id = ?', [userId]);
    const docsTotal = allDocs.length;
    const docsCompleted = allDocs.filter(doc => 
      doc.status === 'Verified' || doc.status === 'Uploaded'
    ).length;
    
    // Get training progress
    const [allTraining] = await db.execute('SELECT completed FROM user_training_progress WHERE user_id = ?', [userId]);
    const trainingTotal = allTraining.length;
    const trainingCompleted = allTraining.filter(training => training.completed === 1).length;
    
    // Calculate weighted progress (Tasks: 50%, Documents: 30%, Training: 20%)
    const taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 50 : 0;
    const docProgress = docsTotal > 0 ? (docsCompleted / docsTotal) * 30 : 0;
    const trainingProgress = trainingTotal > 0 ? (trainingCompleted / trainingTotal) * 20 : 0;
    
    const totalProgress = Math.round(taskProgress + docProgress + trainingProgress);
    
    console.log(`Progress calculation for user ${userId}:`);
    console.log(`Tasks: ${tasksCompleted}/${tasksTotal} = ${taskProgress}%`);
    console.log(`Documents: ${docsCompleted}/${docsTotal} = ${docProgress}%`);
    console.log(`Training: ${trainingCompleted}/${trainingTotal} = ${trainingProgress}%`);
    console.log(`Total: ${totalProgress}%`);
    
    // Update user's onboarding_progress in users table
    await db.execute('UPDATE users SET onboarding_progress = ? WHERE id = ?', [totalProgress, userId]);
    
    res.json({ 
      progress: totalProgress,
      breakdown: {
        tasks: { completed: tasksCompleted, total: tasksTotal, percentage: Math.round(taskProgress) },
        documents: { completed: docsCompleted, total: docsTotal, percentage: Math.round(docProgress) },
        training: { completed: trainingCompleted, total: trainingTotal, percentage: Math.round(trainingProgress) }
      }
    });
  } catch (error) {
    return handleDatabaseError(error, res, 'progress calculation');
  }
});

// UPDATE task status or full task details
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, category, due_date } = req.body;
    
    console.log('Updating task:', { id, body: req.body });
    
    const [existingTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const existingTask = existingTasks[0];
    
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check permissions
    if (req.user.role !== 'Admin' && req.user.role !== 'HR' && existingTask.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('Executing query:', query, 'with values:', values);
    await db.execute(query, values);
    
    const [updatedTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const updatedTask = updatedTasks[0];
    
    console.log('Task updated successfully:', updatedTask);
    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    return handleDatabaseError(error, res, 'task update');
  }
});

// DELETE task
app.delete('/api/tasks/:id', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existingTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existingTasks.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    return handleDatabaseError(error, res, 'task deletion');
  }
});

// LOGOUT endpoint (exempt from CSRF)
app.post('/api/logout', async (req, res) => {
  // Blacklist JWT token
  const token = req.cookies.token;
  if (token && tokenBlacklist) {
    await tokenBlacklist.blacklist(token);
  }
  
  // Destroy session
  if (req.session) {
    await req.session.destroy();
  }
  
  // Clear both cookies
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  res.clearCookie('sessionId', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  res.json({ message: 'Logged out successfully' });
});

// GET current user
app.get('/api/me', verifyToken, async (req, res) => {
  try {
    console.log('Current user ID from token:', req.user.id);
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get available roles from user_roles table
    let availableRoles = [user.role];
    let currentRole = user.role;
    
    try {
      const [userRoles] = await db.execute('SELECT role FROM user_roles WHERE user_id = ? AND is_active = TRUE ORDER BY created_at', [req.user.id]);
      if (userRoles.length > 0) {
        availableRoles = userRoles.map(r => r.role);
      }
    } catch (roleError) {
      console.log('user_roles table not available, using single role');
    }
    
    // New users start with 0% progress - no automatic tasks created
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: currentRole,
      availableRoles: availableRoles,
      avatarUrl: user.avatar_url,
      team: user.team,
      jobTitle: user.job_title,
      onboardingProgress: user.onboarding_progress
    });
  } catch (error) {
    console.error('Error in /api/me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET admin dashboard stats
app.get('/api/admin/stats', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    // Count overdue tasks
    const [overdueTasks] = await db.execute(
      'SELECT COUNT(*) as count FROM tasks WHERE due_date < CURDATE() AND status != "Completed"'
    );
    
    res.json({
      overdueTasks: overdueTasks[0].count || 0
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all users with their roles
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    // For document assignment, allow HR/Admin to see all users, others see limited info
    let query = 'SELECT id, name, email, role, team, job_title, onboarding_progress FROM users';
    if (req.user.role === 'Admin' || req.user.role === 'HR') {
      query = 'SELECT * FROM users';
    }
    
    const [users] = await db.execute(query);
    
    // Get available roles from user_roles table for each user (Admin/HR only)
    if (req.user.role === 'Admin' || req.user.role === 'HR') {
      for (let user of users) {
        try {
          const [userRoles] = await db.execute('SELECT role FROM user_roles WHERE user_id = ? AND is_active = TRUE', [user.id]);
          if (userRoles.length > 0) {
            user.availableRoles = userRoles.map(r => r.role);
          } else {
            user.availableRoles = [user.role];
          }
        } catch (roleError) {
          user.availableRoles = [user.role];
        }
      }
    }
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user by ID
app.get('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const user = users[0];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user profile
app.put('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, avatar_url } = req.body;
    
    console.log('Updating user profile:', { id, name, email, avatarLength: avatar_url?.length });
    
    if (avatar_url) {
      await db.execute('UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?', [name, email, avatar_url, id]);
    } else {
      await db.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id]);
    }
    
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    const updatedUser = users[0];
    console.log('Profile updated successfully for user:', id);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SWITCH user role (Admin only or own role with proper validation)
app.put('/api/users/:id/switch-role', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    // Only allow users to switch their own role
    if (req.user.id != id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get user's available roles from user_roles table
    let availableRoles = [req.user.role];
    try {
      const [userRoles] = await db.execute('SELECT role FROM user_roles WHERE user_id = ? AND is_active = TRUE', [req.user.id]);
      if (userRoles.length > 0) {
        availableRoles = userRoles.map(r => r.role);
      }
    } catch (roleError) {
      console.log('user_roles table not available, using single role');
    }
    
    // Check if the requested role is in user's available roles
    if (!availableRoles.includes(role)) {
      return res.status(403).json({ message: 'You do not have permission to switch to this role' });
    }
    
    // Update the primary role in users table
    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    
    res.json({ message: 'Role switched successfully' });
  } catch (error) {
    console.error('Error switching role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user roles
app.get('/api/users/:id/roles', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    const [roles] = await db.execute('SELECT role FROM user_roles WHERE user_id = ? AND is_active = TRUE', [id]);
    res.json(roles.map(r => r.role));
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user roles (Admin only)
app.put('/api/users/:id/roles', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { roles } = req.body;
    
    // Remove existing roles
    await db.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
    
    // Add new roles
    for (const role of roles) {
      await db.execute('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', [id, role]);
    }
    
    // Update primary role in users table (first role)
    if (roles.length > 0) {
      await db.execute('UPDATE users SET role = ? WHERE id = ?', [roles[0], id]);
    }
    
    res.json({ message: 'User roles updated successfully' });
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE user password
app.put('/api/users/:id/password', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Get current user password hash
    const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [id]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password and update with timestamp
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedNewPassword, id]);
    
    console.log(`Password updated for user ${id}`);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all assets
app.get('/api/assets', verifyToken, async (req, res) => {
  try {
    const [assets] = await db.execute('SELECT * FROM it_assets');
    // Convert database field names to match frontend expectations
    const formattedAssets = assets.map(asset => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      serialNumber: asset.serial_number,
      status: asset.status,
      purchaseDate: asset.purchase_date,
      warrantyInfo: asset.warranty_info,
      licenseExpiry: asset.license_expiry,
      location: asset.location,
      assignedTo: asset.assigned_to_id,
      assignedDate: asset.assigned_date
    }));
    res.json(formattedAssets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE asset
app.put('/api/assets/:id', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    await db.execute('UPDATE it_assets SET status = ?, assigned_to_id = ?, assigned_date = ? WHERE id = ?', 
      [status, assignedTo, new Date().toISOString().split('T')[0], id]);
    const [assets] = await db.execute('SELECT * FROM it_assets WHERE id = ?', [id]);
    const updatedAsset = assets[0];
    const formattedAsset = {
      id: updatedAsset.id,
      name: updatedAsset.name,
      type: updatedAsset.type,
      serialNumber: updatedAsset.serial_number,
      status: updatedAsset.status,
      purchaseDate: updatedAsset.purchase_date,
      warrantyInfo: updatedAsset.warranty_info,
      licenseExpiry: updatedAsset.license_expiry,
      location: updatedAsset.location,
      assignedTo: updatedAsset.assigned_to_id,
      assignedDate: updatedAsset.assigned_date
    };
    res.json(formattedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE new user
app.post('/api/users', verifyToken, requireRole(['Admin', 'HR']), asyncHandler(async (req, res) => {
  const { name, email, password, role, team, job_title, start_date } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  
  const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'Employee', avatar_url, team, job_title, start_date, 0]
    );
    
    const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const safeUser = filterUserResponse(newUsers[0]);
    res.status(201).json(safeUser);
  } catch (error) {
    return handleDatabaseError(error, res, 'user creation');
  }
}));

// INVITE user
app.post('/api/users/invite', verifyToken, requireRole(['Admin', 'HR']), asyncHandler(async (req, res) => {
  const { name, email, role, team, job_title, start_date } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }
    
    // Generate secure invitation token
    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    
    // Hash temporary password
    const tempHashedPassword = await bcrypt.hash('TEMP_PASSWORD', 12);
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress, invitation_token, invitation_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, tempHashedPassword, role || 'Employee', avatar_url, team || null, job_title || null, start_date || null, 0, token, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );
    
    // Send welcome notification
    await notificationService.notifyWelcome(result.insertId, name);
    
    // Send invitation email
    console.log('Attempting to send invitation email to:', email);
    try {
      const { sendInvitationEmail } = await import('./services/emailService.js');
      console.log('Email service imported successfully');
      
      // Get email settings from database
      const [emailSettings] = await db.execute(
        'SELECT setting_value FROM organization_settings WHERE setting_key = "email_settings"'
      );
      
      let config = null;
      if (emailSettings.length > 0) {
        config = safeJsonParse(emailSettings[0].setting_value, null);
      }
      
      const emailSent = await sendInvitationEmail(email, name, token, config);
      console.log('Email send result:', emailSent);
      
      const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      const newUser = newUsers[0];
      
      const message = emailSent ? 
        'User invited and email sent successfully! Check server logs for details.' : 
        'User invited but email failed to send. Check email configuration in Settings.';
      
      console.log('Invitation result:', { userId: newUser.id, email, emailSent, message });
      
      res.status(201).json({ 
        user: newUser, 
        emailSent,
        message
      });
    } catch (emailError) {
      logError(emailError, 'email service');
      
      const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      const newUser = newUsers[0];
      
      res.status(201).json({ 
        user: newUser, 
        emailSent: false,
        message: 'User invited but email service unavailable'
      });
    }
}));

// VERIFY invitation token (public endpoint)
app.get('/api/verify-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const [users] = await db.execute(
      'SELECT name, email FROM users WHERE invitation_token = ? AND invitation_expires > ?',
      [token, new Date().toISOString()]
    );
    const user = users[0];
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// SETUP password (public endpoint)
app.post('/api/setup-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Find user by token and check if not expired
    const [users] = await db.execute(
      'SELECT * FROM users WHERE invitation_token = ? AND invitation_expires > ?',
      [token, new Date().toISOString()]
    );
    const user = users[0];
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }
    
    // Hash password and update user
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.execute(
      'UPDATE users SET password_hash = ?, invitation_token = NULL, invitation_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    res.json({ message: 'Password set successfully. You can now login.' });
  } catch (error) {
    console.error('Error setting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// FORGOT password (public endpoint)
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await db.execute(
      'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [resetToken, expiresAt.toISOString().slice(0, 19).replace('T', ' '), user.id]
    );
    
    // Try to send email
    try {
      const { sendResetEmail } = await import('./services/emailService.js');
      await sendResetEmail(email, user.name, resetToken);
      res.json({ message: 'Password reset link sent to your email' });
    } catch (emailError) {
      console.error('Email service error:', emailError);
      console.log('Reset token generated - check secure logs for details');
      
      // Log token to secure location only
      const fs = await import('fs');
      const logEntry = `${new Date().toISOString()} - Reset token for ${email}: ${resetToken}\n`;
      fs.default.appendFileSync('./reset-tokens.log', logEntry, { mode: 0o600 });
      res.json({ message: `Reset token generated but email service unavailable. Reset token: ${resetToken}` });
    }
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET password (public endpoint)
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const [users] = await db.execute(
      'SELECT * FROM users WHERE reset_token = ? AND reset_expires > ?',
      [token, new Date().toISOString()]
    );
    const user = users[0];
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Hash password and update user
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET notifications for user
app.get('/api/notifications/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const [notifications] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE notification as read
app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE all notifications as read for user
app.put('/api/notifications/user/:userId/read-all', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CHANGE password (for authenticated users)
app.post('/api/auth/change-password', verifyToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }
  
  try {
    const [users] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Create password history table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS password_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Check last 12 passwords
    const [passwordHistory] = await db.execute(
      'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 12',
      [req.user.id]
    );
    
    // Check if new password matches any of the last 12 passwords
    for (const oldPassword of passwordHistory) {
      const isReused = await bcrypt.compare(newPassword, oldPassword.password_hash);
      if (isReused) {
        return res.status(400).json({ message: 'Cannot reuse any of the last 12 passwords' });
      }
    }
    
    // Check for compromised passwords
    const compromisedPasswords = [
      'password', 'password123', 'password1', 'password12', 'password1234',
      'admin', 'admin123', 'admin1', 'administrator', 'root', 'root123',
      '123456', '1234567', '12345678', '123456789', '1234567890',
      'qwerty', 'qwerty123', 'qwertyuiop', 'asdfgh', 'zxcvbn',
      'welcome', 'welcome123', 'letmein', 'monkey', 'dragon',
      'abc123', 'abcdef', 'abcd1234', 'test', 'test123',
      'user', 'user123', 'guest', 'guest123', 'demo', 'demo123',
      'login', 'login123', 'pass', 'pass123', 'secret', 'secret123'
    ];
    
    const lowerPassword = newPassword.toLowerCase();
    if (compromisedPasswords.some(weak => lowerPassword === weak || lowerPassword.includes(weak))) {
      return res.status(400).json({ message: 'Password is too common and easily compromised. Please choose a stronger password.' });
    }
    
    // Hash new password and update with timestamp
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedNewPassword, req.user.id]);
    
    // Store current password in history
    await db.execute(
      'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)',
      [req.user.id, user.password_hash]
    );
    
    // Keep only last 12 passwords in history
    await db.execute(
      'DELETE FROM password_history WHERE user_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 12) AS temp)',
      [req.user.id, req.user.id]
    );
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return handleDatabaseError(error, res, 'password change');
  }
}));

// LOGIN authentication with MFA support
app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  // Find user by email
  const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
  const user = users[0];
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // Check password using bcrypt
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
    
    // Check password expiry
    const [passwordPolicy] = await db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "password_policy"'
    );
    
    if (passwordPolicy.length > 0) {
      const policy = safeJsonParse(passwordPolicy[0].setting_value, { expiryDays: 90 });
      if (policy.expiryDays && policy.expiryDays > 0) {
        // Check password age
        const passwordDate = user.password_changed_at;
        if (passwordDate) {
          const daysSinceChange = Math.floor((new Date() - new Date(passwordDate)) / (1000 * 60 * 60 * 24));
          if (daysSinceChange >= policy.expiryDays) {
            return res.json({
              requiresPasswordChange: true,
              userEmail: user.email,
              message: `Your password has expired after ${policy.expiryDays} days. Please change it to continue.`
            });
          }
        }
      }
    }
    
    // Check if MFA is required
    const [mfaSettings] = await db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "mfa_policy"'
    );
    
    let mfaRequired = false;
    if (mfaSettings.length > 0) {
      const policy = safeJsonParse(mfaSettings[0].setting_value, { enforced: false });
      mfaRequired = policy.enforced || (policy.require_for_roles && policy.require_for_roles.includes(user.role));
    }
    
    // Check if MFA is required for this user
    if (mfaRequired) {
      // If user hasn't set up MFA yet, redirect to setup
      if (!user.mfa_enabled || !user.mfa_setup_completed) {
        // Generate temporary JWT token for MFA setup
        const { password_hash, invitation_token, invitation_expires, mfa_secret, mfa_backup_codes, ...userData } = user;
        const tempToken = generateToken(userData);
        
        // Set temporary cookie for MFA setup
        res.cookie('token', tempToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 1000, // 1 hour for MFA setup
          path: '/'
        });
        
        return res.json({
          requiresMfaSetup: true,
          userEmail: user.email,
          userName: user.name,
          tempToken: tempToken
        });
      }
      
      // User has MFA set up, check for trusted device
      const deviceFingerprint = crypto.createHash('sha256')
        .update(req.headers['user-agent'] + req.ip)
        .digest('hex');
      
      const [trustedDevices] = await db.execute(
        'SELECT id FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ? AND expires_at > NOW()',
        [user.id, deviceFingerprint]
      );
      
      if (trustedDevices.length === 0) {
        return res.json({
          requiresMfa: true,
          userEmail: user.email,
          mfaEnabled: user.mfa_enabled,
          setupCompleted: user.mfa_setup_completed
        });
      }
    }
    
    // Return user data without password
    const { password_hash, invitation_token, invitation_expires, mfa_secret, mfa_backup_codes, ...userData } = user;
    
    // Create session
    req.session.userId = user.id;
    req.session.data = {
      loginTime: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };
    await req.session.save();
    
    // Also set JWT for backward compatibility
    const token = generateToken(userData);
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge,
      path: '/'
    });
    
  res.json({
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatarUrl: userData.avatar_url,
      team: userData.team,
      jobTitle: userData.job_title,
      onboardingProgress: userData.onboarding_progress
    }
  });
}));

// RESET user progress
app.post('/api/users/:id/reset-progress', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM tasks WHERE user_id = ?', [id]);
    await db.execute('DELETE FROM user_documents WHERE user_id = ?', [id]);
    await db.execute('DELETE FROM user_training_progress WHERE user_id = ?', [id]);
    await db.execute('UPDATE users SET onboarding_progress = 0 WHERE id = ?', [id]);
    res.json({ message: 'User progress reset successfully' });
  } catch (error) {
    console.error('Error resetting user progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE user
app.delete('/api/users/:id', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE asset
app.delete('/api/assets/:id', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM it_assets WHERE id = ?', [id]);
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Settings Routes
import { getSettings, updateSettings } from './controllers/settingsController.js';

// Initialize settings table if it doesn't exist
app.get('/api/init-settings', async (req, res) => {
  try {
    // Create organization_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS organization_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value JSON NOT NULL,
        category ENUM('company', 'security', 'notifications', 'policies', 'system', 'integrations', 'compliance') NOT NULL,
        description TEXT,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category),
        INDEX idx_setting_key (setting_key)
      )
    `);
    
    // Create task_categories table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS task_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6366f1',
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Insert default settings if they don't exist
    const defaultSettings = [
      ['company_info', '{"name": "Your Company", "logo": "", "primaryColor": "#6366f1", "secondaryColor": "#f3f4f6", "darkMode": false}', 'company', 'Company branding and identity'],
      ['working_hours', '{"startTime": "09:00", "endTime": "17:00", "timezone": "UTC", "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}', 'policies', 'Default working hours and schedule'],
      ['password_policy', '{"minLength": 8, "requireUppercase": true, "requireNumbers": true, "expiryDays": 90}', 'security', 'Password requirements and policies'],
      ['notification_preferences', '{"email": {"enabled": true, "onboarding": true, "taskReminders": true}, "sms": {"enabled": false}}', 'notifications', 'System notification preferences'],
      ['backup_settings', '{"autoBackup": true, "frequency": "daily", "retentionDays": 30, "location": "cloud", "encryption": true}', 'system', 'Backup and data retention settings'],
      ['maintenance_mode', '{"enabled": false, "message": "System under maintenance", "allowedRoles": ["Admin"]}', 'system', 'System maintenance configuration'],
      ['integration_settings', '{"sso": {"enabled": false, "provider": "none", "domain": ""}, "slack": {"enabled": false, "webhook": ""}, "teams": {"enabled": false, "webhook": ""}}', 'integrations', 'Third-party integration settings'],
      ['email_settings', '{"smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_password": "", "from_email": "", "from_name": "Onboardly"}', 'system', 'Email server configuration']
    ];
    
    for (const [key, value, category, description] of defaultSettings) {
      await db.execute(
        'INSERT IGNORE INTO organization_settings (setting_key, setting_value, category, description) VALUES (?, ?, ?, ?)',
        [key, value, category, description]
      );
    }
    
    // Insert default task categories if they don't exist
    const defaultCategories = [
      ['General', 'General onboarding tasks', '#6366f1'],
      ['Paperwork', 'Document and form completion tasks', '#10b981'],
      ['IT Setup', 'Technology and system setup tasks', '#f59e0b'],
      ['Training', 'Learning and training related tasks', '#8b5cf6'],
      ['HR', 'Human resources related tasks', '#ef4444'],
      ['Compliance', 'Compliance and policy related tasks', '#06b6d4']
    ];
    
    for (const [name, description, color] of defaultCategories) {
      await db.execute(
        'INSERT IGNORE INTO task_categories (name, description, color, created_by) VALUES (?, ?, ?, ?)',
        [name, description, color, 1]
      );
    }
    
    res.json({ message: 'Settings and categories initialized successfully' });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({ message: 'Failed to initialize settings' });
  }
});

// Apply employee_id migration
app.get('/api/migrate-employee-id', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    // Check if employee_id column exists
    const [columns] = await db.execute('SHOW COLUMNS FROM users LIKE ?', ['employee_id']);
    
    if (columns.length === 0) {
      // Add employee_id column
      await db.execute('ALTER TABLE users ADD COLUMN employee_id VARCHAR(50) UNIQUE AFTER id');
      
      // Add index
      await db.execute('CREATE INDEX idx_employee_id ON users(employee_id)');
      
      // Update existing users with auto-generated employee IDs
      await db.execute('UPDATE users SET employee_id = CONCAT(?, LPAD(id, 3, ?)) WHERE employee_id IS NULL', ['EMP', '0']);
      
      res.json({ message: 'Employee ID migration completed successfully' });
    } else {
      res.json({ message: 'Employee ID column already exists' });
    }
  } catch (error) {
    console.error('Error applying employee ID migration:', error);
    res.status(500).json({ message: 'Migration failed', error: error.message });
  }
});

// Initialize database tables - Enhanced
app.get('/api/init-db', async (req, res) => {
  try {
    // Drop and recreate user_documents table
    await db.execute('DROP TABLE IF EXISTS user_documents');
    await db.execute(`
      CREATE TABLE user_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        status ENUM('Pending', 'Uploaded', 'In Review', 'Verified', 'Rejected', 'Overdue', 'Expired') DEFAULT 'Pending',
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_size BIGINT,
        file_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        action_date DATE,
        rejection_reason TEXT,
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        category VARCHAR(50) DEFAULT 'General',
        due_date DATE,
        assigned_by INT,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_category (category),
        INDEX idx_due_date (due_date),
        INDEX idx_priority (priority),
        UNIQUE KEY unique_user_document (user_id, name)
      )
    `);
    
    // Drop and recreate company_documents table
    await db.execute('DROP TABLE IF EXISTS company_documents');
    await db.execute(`
      CREATE TABLE company_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'General',
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_size BIGINT,
        version VARCHAR(20) DEFAULT '1.0',
        is_active BOOLEAN DEFAULT TRUE,
        uploaded_by INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    
    // Drop and recreate document_templates table
    await db.execute('DROP TABLE IF EXISTS document_templates');
    await db.execute(`
      CREATE TABLE document_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'General',
        priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
        due_in_days INT,
        is_required BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_size BIGINT,
        version VARCHAR(20) DEFAULT '1.0',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    
    // Create task_categories table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS task_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        color VARCHAR(7) DEFAULT '#6366f1',
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create document_history table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS document_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        user_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        old_status VARCHAR(50),
        new_status VARCHAR(50),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_document_user (document_id, user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      )
    `);
    
    // Insert default task categories
    const defaultCategories = [
      ['General', 'General onboarding tasks', '#6366f1'],
      ['Paperwork', 'Document and form completion tasks', '#10b981'],
      ['IT Setup', 'Technology and system setup tasks', '#f59e0b'],
      ['Training', 'Learning and training related tasks', '#8b5cf6'],
      ['HR', 'Human resources related tasks', '#ef4444'],
      ['Compliance', 'Compliance and policy related tasks', '#06b6d4']
    ];
    
    for (const [name, description, color] of defaultCategories) {
      await db.execute(
        'INSERT IGNORE INTO task_categories (name, description, color, created_by) VALUES (?, ?, ?, ?)',
        [name, description, color, 1]
      );
    }
    
    // Insert sample company documents
    const sampleDocs = [
      ['Employee Handbook', 'Complete guide for new employees', 'Onboarding'],
      ['Code of Conduct', 'Company policies and ethical guidelines', 'Compliance'],
      ['Safety Manual', 'Workplace safety procedures', 'Compliance'],
      ['Benefits Guide', 'Employee benefits and perks', 'General']
    ];
    
    for (const [name, description, category] of sampleDocs) {
      await db.execute(
        'INSERT IGNORE INTO company_documents (name, description, category, uploaded_by) VALUES (?, ?, ?, ?)',
        [name, description, category, 1]
      );
    }
    
    res.json({ message: 'Database tables recreated successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ message: 'Failed to initialize database' });
  }
});

// Check maintenance mode status
app.get('/api/maintenance-status', async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "maintenance_mode"'
    );
    
    if (settings.length > 0) {
      const maintenanceMode = safeJsonParse(settings[0].setting_value, { enabled: false, message: '' });
      res.json(maintenanceMode);
    } else {
      res.json({ enabled: false, message: '' });
    }
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    res.json({ enabled: false, message: '' });
  }
});

// GET public settings (no auth required)
app.get('/api/public-settings', async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_key, setting_value FROM organization_settings WHERE setting_key IN ("company_info", "maintenance_mode")'
    );
    
    const publicSettings = {};
    settings.forEach(setting => {
      publicSettings[setting.setting_key] = safeJsonParse(setting.setting_value, {});
    });
    
    res.json(publicSettings);
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.json({ company_info: { name: 'Employee Onboarding Portal' }, maintenance_mode: { enabled: false } });
  }
});

// GET organization settings (Admin only)
app.get('/api/settings', verifyToken, requireRole(['Admin']), getSettings);

// UPDATE organization settings (Admin only)
app.put('/api/settings', verifyToken, requireRole(['Admin']), updateSettings);

// Test email configuration
app.post('/api/test-email', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    // Get email settings from database
    const [emailSettings] = await db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "email_settings"'
    );
    
    let config = null;
    if (emailSettings.length > 0) {
      config = JSON.parse(emailSettings[0].setting_value);
    }
    
    const { testEmailConfig } = await import('./services/emailService.js');
    const result = await testEmailConfig(testEmail, config);
    res.json(result);
  } catch (error) {
    logError(error, 'email test');
    res.status(500).json({ success: false, message: 'Email service unavailable' });
  }
});

// Import MFA routes and enforcement middleware
import mfaRoutes from './routes/mfa.js';
import requireMfaSetup from './middleware/mfa-enforcement.js';

// Use MFA routes (exclude from enforcement)
app.use('/api/mfa', mfaRoutes);

// Apply MFA enforcement to protected routes
app.use('/api/tasks', verifyToken, requireMfaSetup);
app.use('/api/users', verifyToken, requireMfaSetup);
app.use('/api/assets', verifyToken, requireMfaSetup);
app.use('/api/policies', verifyToken, requireMfaSetup);
app.use('/api/documents', verifyToken, requireMfaSetup);
app.use('/api/training', verifyToken, requireMfaSetup);
app.use('/api/assignments', verifyToken, requireMfaSetup);
app.use('/api/settings', verifyToken, requireMfaSetup);
app.use('/api/admin', verifyToken, requireMfaSetup);
app.use('/api/chat', verifyToken, requireMfaSetup);
app.use('/api/search', verifyToken, requireMfaSetup);
app.use('/api/notifications', verifyToken, requireMfaSetup);
app.use('/api/task-categories', verifyToken, requireMfaSetup);
app.use('/api/employees', verifyToken, requireMfaSetup);

// Import Chat routes
import chatRoutes from './routes/chat.js';

// Import notification service
import notificationService from './services/notificationService.js';
import reminderService from './services/reminderService.js';





// Global search endpoint
app.get('/api/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json({ policies: [], users: [], tasks: [] });
    }
    
    const searchTerm = `%${q}%`;
    
    // Search policies (case insensitive)
    const [policies] = await db.execute(
      'SELECT id, title, category, summary FROM policies WHERE LOWER(title) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?) OR LOWER(summary) LIKE LOWER(?) LIMIT 5',
      [searchTerm, searchTerm, searchTerm]
    );
    
    // Search users (Admin/HR only)
    let users = [];
    if (req.user.role === 'Admin' || req.user.role === 'HR') {
      const [userResults] = await db.execute(
        'SELECT id, name, email, role, team FROM users WHERE LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?) OR LOWER(team) LIKE LOWER(?) LIMIT 5',
        [searchTerm, searchTerm, searchTerm]
      );
      users = userResults;
    }
    
    // Search tasks (user's own tasks)
    const [tasks] = await db.execute(
      'SELECT id, title, category, status FROM tasks WHERE user_id = ? AND (LOWER(title) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?)) LIMIT 5',
      [req.user.id, searchTerm, searchTerm]
    );
    
    res.json({ policies, users, tasks });
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// GET all policies
app.get('/api/policies', verifyToken, async (req, res) => {
  try {
    const [policies] = await db.execute('SELECT * FROM policies ORDER BY id ASC');
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// POST new policy (text-only)
app.post('/api/policies', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { title, category, summary, content, version, effectiveDate } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required' });
    }
    
    // Get next sort order
    const [maxOrder] = await db.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM policies');
    const nextOrder = maxOrder[0].next_order;
    
    const [result] = await db.execute(
      'INSERT INTO policies (title, category, summary, content, version, effective_date, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, category, summary || '', content || '', version || '1.0', effectiveDate || null, nextOrder, 1]
    );
    
    const [policies] = await db.execute('SELECT * FROM policies WHERE id = ?', [result.insertId]);
    const newPolicy = policies[0];
    res.status(201).json(newPolicy);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update policy
app.put('/api/policies/:id', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, summary, content, version, effectiveDate } = req.body;
    
    await db.execute(
      'UPDATE policies SET title = ?, category = ?, summary = ?, content = ?, version = ?, effective_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, category, summary, content, version, effectiveDate, id]
    );
    
    const [policies] = await db.execute('SELECT * FROM policies WHERE id = ?', [id]);
    const updatedPolicy = policies[0];
    res.json(updatedPolicy);
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE policy
app.delete('/api/policies/:id', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM policies WHERE id = ?', [id]);
    res.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload policy file endpoint
app.post('/api/policies/upload', verifyToken, requireRole(['Admin', 'HR']), upload.single('policyFile'), sanitizeUploadPath, validateUploadSecurity, asyncHandler(async (req, res) => {
  try {
    console.log('Policy upload request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, category, summary, content, version, effectiveDate } = req.body;
    console.log('Parsed data:', { title, category, summary, version, effectiveDate });
    
    if (!title || !category) {
      console.log('Missing title or category');
      return res.status(400).json({ error: 'Title and category are required' });
    }

    // Validate and sanitize file path
    const sanitizedFilename = sanitizeFilename(req.file.filename);
    const fileUrl = `/uploads/${sanitizedFilename}`;
    
    console.log('Inserting policy into database...');
    // Get next sort order
    const [maxOrder] = await db.execute('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM policies');
    const nextOrder = maxOrder[0].next_order;
    
    const [result] = await db.execute(
      'INSERT INTO policies (title, category, summary, content, file_url, file_name, file_type, file_size, version, effective_date, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, category, summary || '', content || '', fileUrl, req.file.originalname, req.file.mimetype, req.file.size, version || '1.0', effectiveDate || null, nextOrder, 1]
    );
    
    console.log('Database insert result:', result);
    
    const [policies] = await db.execute('SELECT * FROM policies WHERE id = ?', [result.insertId]);
    const newPolicy = policies[0];
    console.log('Policy created successfully:', newPolicy);
    
    res.json({
      success: true,
      message: 'Policy uploaded successfully',
      policy: newPolicy
    });
  } catch (error) {
    logError(error, 'policy upload');
    res.status(500).json({ error: 'Upload failed' });
  }
}));



// Get user documents
app.get('/api/documents/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.execute(
      'SELECT id, name, status, action_date, rejection_reason, file_url, file_name, file_size, file_type FROM user_documents WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get all user documents (HR/Admin only)
app.get('/api/documents/all', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        ud.id,
        ud.user_id,
        ud.name,
        ud.status,
        ud.action_date,
        ud.rejection_reason,
        ud.file_url,
        ud.file_name,
        ud.file_size,
        ud.uploaded_at,
        ud.priority,
        u.name as user_name, 
        u.email as user_email,
        u.team,
        CASE 
          WHEN ud.due_date < CURDATE() AND ud.status IN ('Pending', 'Uploaded') THEN 'Overdue'
          ELSE ud.status
        END as computed_status
      FROM user_documents ud 
      LEFT JOIN users u ON ud.user_id = u.id 
      ORDER BY 
        CASE COALESCE(ud.priority, 'Medium')
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END,
        ud.uploaded_at DESC
    `);
    
    // Format response to match frontend expectations
    const formattedRows = rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      status: row.computed_status,
      action_date: row.action_date,
      rejection_reason: row.rejection_reason,
      user_id: row.user_id,
      user_name: row.user_name || 'Unknown User',
      user_email: row.user_email || '',
      file_url: row.file_url,
      file_name: row.file_name,
      file_size: row.file_size,
      uploaded_at: row.uploaded_at,
      priority: row.priority || 'Medium'
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching all documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get document analytics (HR/Admin only)
app.get('/api/documents/analytics', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Uploaded' THEN 1 ELSE 0 END) as uploaded,
        SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN due_date < CURDATE() AND status IN ('Pending', 'Uploaded') THEN 1 ELSE 0 END) as overdue
      FROM user_documents
    `);
    
    res.json({ 
      stats: stats[0]
    });
  } catch (error) {
    console.error('Error fetching document analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Assign document to users (HR/Admin only) - Enhanced
app.post('/api/documents/assign', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { documentName, userIds, priority, dueDate, category, assignBy, department, role, team } = req.body;
    
    if (!documentName) {
      return res.status(400).json({ error: 'Document name is required' });
    }
    
    let targetUserIds = userIds || [];
    
    // Bulk assignment by criteria
    if (assignBy && assignBy !== 'individual') {
      let query = 'SELECT id FROM users WHERE 1=1';
      let params = [];
      
      if (assignBy === 'department' && department) {
        query += ' AND team = ?';
        params.push(department);
      } else if (assignBy === 'role' && role) {
        query += ' AND role = ?';
        params.push(role);
      } else if (assignBy === 'team' && team) {
        query += ' AND team = ?';
        params.push(team);
      }
      
      const [users] = await db.execute(query, params);
      targetUserIds = users.map(user => user.id);
    }
    
    if (targetUserIds.length === 0) {
      return res.status(400).json({ error: 'No users selected for assignment' });
    }
    
    // Calculate due date if not provided
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate && priority) {
      const daysMap = { 'Critical': 3, 'High': 7, 'Medium': 14, 'Low': 30 };
      const days = daysMap[priority] || 14;
      const due = new Date();
      due.setDate(due.getDate() + days);
      calculatedDueDate = due.toISOString().split('T')[0];
    }
    
    // Insert document requirement for each user
    for (const userId of targetUserIds) {
      if (userId) {
        await db.execute(
          'INSERT INTO user_documents (user_id, name, status, priority, due_date, category, assigned_by, assigned_date) VALUES (?, ?, "Pending", ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE status = "Pending", priority = VALUES(priority), due_date = VALUES(due_date), category = VALUES(category)',
          [userId, documentName, priority || 'Medium', calculatedDueDate, category || 'General', req.user.id]
        );
      }
    }
    
    res.json({ message: `Document assigned to ${targetUserIds.length} users successfully` });
  } catch (error) {
    console.error('Error assigning document:', error);
    res.status(500).json({ error: 'Failed to assign document' });
  }
});

// Create document template (HR/Admin only)
app.post('/api/documents/templates', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { name, description, category, priority, dueInDays, isRequired } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO document_templates (name, description, category, priority, due_in_days, is_required, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', category || 'General', priority || 'Medium', dueInDays || null, isRequired || true, req.user.id]
    );
    
    const [template] = await db.execute('SELECT * FROM document_templates WHERE id = ?', [result.insertId]);
    res.json(template[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Get document templates (HR/Admin only) - Enhanced
app.get('/api/documents/templates', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const [templates] = await db.execute(`
      SELECT dt.*, u.name as created_by_name 
      FROM document_templates dt 
      LEFT JOIN users u ON dt.created_by = u.id 
      WHERE dt.is_active = TRUE 
      ORDER BY dt.category, dt.name
    `);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Upload document template (HR/Admin only)
app.post('/api/documents/templates/upload', verifyToken, requireRole(['Admin', 'HR']), upload.single('templateFile'), async (req, res) => {
  try {
    const { name, description, category, priority, dueInDays, isRequired } = req.body;
    
    if (!req.file || !name) {
      return res.status(400).json({ error: 'File and name are required' });
    }
    
    // Validate and sanitize file path
    const sanitizedFilename = sanitizeFilename(req.file.filename);
    const fileUrl = `/uploads/${sanitizedFilename}`;
    
    const [result] = await db.execute(
      'INSERT INTO document_templates (name, description, category, priority, due_in_days, is_required, file_url, file_name, file_size, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', category || 'General', priority || 'Medium', dueInDays || null, isRequired === 'true', fileUrl, req.file.originalname, req.file.size, req.user.id]
    );
    
    res.json({ success: true, templateId: result.insertId });
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({ error: 'Failed to upload template' });
  }
});

// Get company documents
app.get('/api/documents/company', verifyToken, async (req, res) => {
  try {
    const [documents] = await db.execute(`
      SELECT * FROM company_documents 
      WHERE is_active = TRUE 
      ORDER BY category, name
    `);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching company documents:', error);
    res.status(500).json({ error: 'Failed to fetch company documents' });
  }
});

// Upload company document (HR/Admin only)
app.post('/api/documents/company/upload', verifyToken, requireRole(['Admin', 'HR']), upload.single('companyFile'), async (req, res) => {
  try {
    const { name, description, category, version } = req.body;
    
    if (!req.file || !name) {
      return res.status(400).json({ error: 'File and name are required' });
    }
    
    // Validate and sanitize file path
    const sanitizedFilename = sanitizeFilename(req.file.filename);
    const fileUrl = `/uploads/${sanitizedFilename}`;
    
    const [result] = await db.execute(
      'INSERT INTO company_documents (name, description, category, file_url, file_name, file_size, version, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || '', category || 'General', fileUrl, req.file.originalname, req.file.size, version || '1.0', req.user.id]
    );
    
    res.json({ success: true, documentId: result.insertId });
  } catch (error) {
    console.error('Error uploading company document:', error);
    res.status(500).json({ error: 'Failed to upload company document' });
  }
});

// Get document categories
app.get('/api/documents/categories', verifyToken, async (req, res) => {
  try {
    const categories = [
      { id: 'onboarding', name: 'Onboarding', description: 'New employee documents', color: '#3b82f6' },
      { id: 'compliance', name: 'Compliance', description: 'Legal and regulatory documents', color: '#ef4444' },
      { id: 'personal', name: 'Personal', description: 'Personal information documents', color: '#10b981' },
      { id: 'legal', name: 'Legal', description: 'Legal agreements and contracts', color: '#8b5cf6' },
      { id: 'training', name: 'Training', description: 'Training and certification documents', color: '#f59e0b' },
      { id: 'general', name: 'General', description: 'General purpose documents', color: '#6b7280' }
    ];
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Bulk document actions (HR/Admin only)
app.post('/api/documents/bulk-action', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { action, documentIds, rejectionReason } = req.body;
    
    if (!action || !documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'Action and document IDs are required' });
    }
    
    // Validate document IDs are numbers to prevent injection
    const validIds = documentIds.filter(id => Number.isInteger(Number(id)));
    if (validIds.length !== documentIds.length) {
      return res.status(400).json({ error: 'Invalid document IDs provided' });
    }
    
    const placeholders = validIds.map(() => '?').join(',');
    
    if (action === 'verify') {
      await db.execute(
        `UPDATE user_documents SET status = 'Verified', action_date = CURDATE(), rejection_reason = NULL WHERE id IN (${placeholders})`,
        validIds
      );
    } else if (action === 'reject') {
      await db.execute(
        `UPDATE user_documents SET status = 'Rejected', action_date = CURDATE(), rejection_reason = ? WHERE id IN (${placeholders})`,
        [rejectionReason || 'Bulk rejection', ...validIds]
      );
    }
    
    res.json({ success: true, message: `${documentIds.length} documents ${action}ed successfully` });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// Update document status (verify/reject)
app.put('/api/documents/:id/status', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    await db.execute(
      'UPDATE user_documents SET status = ?, action_date = CURDATE(), rejection_reason = ? WHERE id = ?',
      [status, rejectionReason || null, id]
    );
    
    // Get document info for notification
    const [doc] = await db.execute('SELECT user_id, name FROM user_documents WHERE id = ?', [id]);
    if (doc[0]) {
      await notificationService.notifyDocumentStatus(doc[0].user_id, doc[0].name, status, rejectionReason);
    }
    
    // Update assignment status if document is verified
    if (status === 'Verified') {
      const [doc] = await db.execute('SELECT user_id FROM user_documents WHERE id = ?', [id]);
      if (doc[0]) {
        await db.execute(
          'UPDATE user_assignments SET status = "completed", completed_date = NOW() WHERE user_id = ? AND item_type = "document" AND item_id = ?',
          [doc[0].user_id, id]
        );
      }
    }
    
    res.json({ success: true, message: 'Document status updated' });
  } catch (error) {
    console.error('Error updating document status:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// POST new asset
app.post('/api/assets', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    console.log('Received asset data:', req.body);
    const { name, type, serialNumber, purchaseDate, warrantyInfo, licenseExpiry, location } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO it_assets (name, type, serial_number, status, purchase_date, warranty_info, license_expiry, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, serialNumber || '', 'Unassigned', purchaseDate || null, warrantyInfo || '', licenseExpiry || null, location || '']
    );
    
    const [assets] = await db.execute('SELECT * FROM it_assets WHERE id = ?', [result.insertId]);
    const newAsset = assets[0];
    const formattedAsset = {
      id: newAsset.id,
      name: newAsset.name,
      type: newAsset.type,
      serialNumber: newAsset.serial_number,
      status: newAsset.status,
      purchaseDate: newAsset.purchase_date,
      warrantyInfo: newAsset.warranty_info,
      licenseExpiry: newAsset.license_expiry,
      location: newAsset.location,
      assignedTo: newAsset.assigned_to_id,
      assignedDate: newAsset.assigned_date
    };
    console.log('Asset created successfully:', formattedAsset);
    res.status(201).json(formattedAsset);
  } catch (error) {
    console.error('Detailed error creating asset:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// Upload training material endpoint
app.post('/api/training/upload', upload.fields([{name: 'trainingFile', maxCount: 1}, {name: 'thumbnail', maxCount: 1}]), sanitizeUploadPath, validateUploadSecurity, asyncHandler(async (req, res) => {
  try {
    console.log('Training upload request received');
    console.log('File:', req.file);
    console.log('Body:', req.body);
    
    const files = req.files;
    const trainingFile = files?.trainingFile?.[0];
    const thumbnailFile = files?.thumbnail?.[0];
    
    if (!trainingFile) {
      console.log('No training file in request');
      return res.status(400).json({ error: 'No training file uploaded' });
    }

    const { title, type, duration } = req.body;
    console.log('Parsed data:', { title, type, duration });
    
    // Validation
    if (!title || !title.trim()) {
      console.log('Missing or empty title');
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!type || !['Video', 'PDF', 'DOC', 'Quiz'].includes(type)) {
      console.log('Invalid type:', type);
      return res.status(400).json({ error: 'Invalid type. Must be Video, PDF, DOC, or Quiz' });
    }
    
    if (!duration || !duration.trim()) {
      console.log('Missing duration');
      return res.status(400).json({ error: 'Duration is required' });
    }
    
    // Validate duration format
    const durationPattern = /^\d+\s*(minutes?|mins?|hours?|hrs?)$/i;
    if (!durationPattern.test(duration.trim())) {
      console.log('Invalid duration format:', duration);
      return res.status(400).json({ error: 'Duration must be in time format (e.g., "30 minutes", "1 hour", "45 mins")' });
    }
    
    // File size validation
    if (!validateFileSize(trainingFile.size, 50 * 1024 * 1024)) {
      return res.status(400).json({ error: 'File size must be less than 50MB' });
    }

    // Validate file path
    const sanitizedFilename = sanitizeFilename(trainingFile.filename);
    const fileUrl = `/uploads/${sanitizedFilename}`;
    let thumbnailUrl = 'https://picsum.photos/400/225?random=' + Date.now();
    
    if (thumbnailFile) {
      const sanitizedThumbFilename = sanitizeFilename(thumbnailFile.filename);
      thumbnailUrl = `/uploads/${sanitizedThumbFilename}`;
    }
    
    console.log('File URL:', fileUrl);
    
    console.log('Inserting into database...');
    const [result] = await db.execute(
      'INSERT INTO training_modules (title, type, duration, file_url, thumbnail_url) VALUES (?, ?, ?, ?, ?)',
      [title.trim(), type, duration.trim(), fileUrl, thumbnailUrl]
    );
    
    console.log('Database insert result:', result);

    res.json({
      success: true,
      message: 'Training material uploaded successfully',
      module: {
        id: result.insertId,
        title,
        type,
        duration: duration || '0 minutes',
        fileUrl
      }
    });
  } catch (error) {
    logError(error, 'training upload');
    res.status(500).json({ error: 'Upload failed' });
  }
}));

// Get all training modules
app.get('/api/training', async (req, res) => {
  try {
    const [modules] = await db.execute('SELECT * FROM training_modules ORDER BY id DESC');
    res.json(modules);
  } catch (error) {
    console.error('Error fetching training modules:', error);
    res.status(500).json({ error: 'Failed to fetch training modules' });
  }
});

// Get training modules with user progress (only assigned modules)
app.get('/api/training/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get only training modules assigned to this user
    const [modules] = await db.execute(`
      SELECT tm.*, 
             COALESCE(utp.completed, FALSE) as completed
      FROM training_modules tm
      INNER JOIN user_assignments ua ON tm.id = ua.item_id AND ua.item_type = 'training' AND ua.user_id = ?
      LEFT JOIN user_training_progress utp ON tm.id = utp.module_id AND utp.user_id = ?
      ORDER BY ua.assigned_date DESC
    `, [userId, userId]);
    
    console.log(`Found ${modules.length} assigned training modules for user ${userId}`);
    res.json(modules);
  } catch (error) {
    console.error('Error fetching training modules:', error);
    res.status(500).json({ error: 'Failed to fetch training modules' });
  }
});

// Mark training module as completed
app.post('/api/training/:moduleId/complete', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { userId } = req.body;
    
    console.log(`Marking training ${moduleId} as completed for user ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO user_training_progress (user_id, module_id, completed) VALUES (?, ?, TRUE) ON DUPLICATE KEY UPDATE completed = TRUE',
      [userId, moduleId]
    );
    
    console.log('Training progress update result:', result);
    
    res.json({ success: true, message: 'Training module marked as completed' });
  } catch (error) {
    console.error('Error marking training as completed:', error);
    res.status(500).json({ error: 'Failed to mark training as completed' });
  }
});

// Delete training module
app.delete('/api/training/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM training_modules WHERE id = ?', [id]);
    res.json({ message: 'Training module deleted successfully' });
  } catch (error) {
    console.error('Error deleting training module:', error);
    res.status(500).json({ error: 'Failed to delete training module' });
  }
});

// Upload document endpoint
app.post('/api/documents/upload', upload.single('document'), sanitizeUploadPath, validateUploadSecurity, asyncHandler(async (req, res) => {
  try {
    console.log('Upload request received:', {
      file: req.file ? req.file.filename : 'No file',
      body: req.body
    });
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, documentName } = req.body;
    if (!userId || !documentName) {
      return res.status(400).json({ error: 'User ID and document name are required' });
    }

    // Validate and sanitize file path
    const sanitizedFilename = sanitizeFilename(req.file.filename);
    const fileUrl = `/uploads/${sanitizedFilename}`;
    
    console.log('Inserting document into database:', {
      userId,
      documentName,
      fileUrl,
      originalName: req.file.originalname
    });
    
    // Check if document already exists for this user
    const [existing] = await db.execute(
      'SELECT id FROM user_documents WHERE user_id = ? AND name = ?',
      [userId, documentName]
    );
    
    let result;
    if (existing.length > 0) {
      // Update existing document
      result = await db.execute(
        'UPDATE user_documents SET status = "Uploaded", file_url = ?, file_name = ?, file_size = ?, file_type = ?, uploaded_at = NOW(), action_date = CURDATE(), rejection_reason = NULL WHERE user_id = ? AND name = ?',
        [fileUrl, req.file.originalname, req.file.size, req.file.mimetype, userId, documentName]
      );
    } else {
      // Insert new document
      result = await db.execute(
        'INSERT INTO user_documents (user_id, name, status, file_url, file_name, file_size, file_type, uploaded_at) VALUES (?, ?, "Uploaded", ?, ?, ?, ?, NOW())',
        [userId, documentName, fileUrl, req.file.originalname, req.file.size, req.file.mimetype]
      );
    }

    console.log('Document saved successfully:', result);

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
    logError(error, 'document upload');
    res.status(500).json({ error: 'Upload failed' });
  }
}));

// CREATE new task
app.post('/api/tasks', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { title, category, dueDate, assignedUsers } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required' });
    }
    
    // Create task for each assigned user
    const createdTasks = [];
    for (const userId of assignedUsers) {
      const [result] = await db.execute(
        'INSERT INTO tasks (user_id, title, category, due_date, status) VALUES (?, ?, ?, ?, "ToDo")',
        [userId, title, category, dueDate]
      );
      
      createdTasks.push({ id: result.insertId, user_id: userId, title, category });
    }
    
    res.json({ message: 'Tasks created and assigned successfully', tasks: createdTasks });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assignment endpoints

// GET assignments for a user
app.get('/api/assignments/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching assignments for user:', userId);
    
    // Get all assignments for user with proper joins
    const [assignments] = await db.execute(`
      SELECT ua.id, ua.user_id, ua.item_type, ua.item_id, ua.assigned_by, ua.assigned_date, 
             ua.due_date, ua.status, ua.completed_date, ua.is_required,
             CASE 
               WHEN ua.item_type = 'task' THEN COALESCE(t.title, CONCAT('Task #', ua.item_id))
               WHEN ua.item_type = 'policy' THEN p.title
               WHEN ua.item_type = 'training' THEN tm.title
               WHEN ua.item_type = 'document' THEN ud.name
             END as item_title,
             CASE 
               WHEN ua.item_type = 'task' THEN COALESCE(t.category, 'General')
               WHEN ua.item_type = 'policy' THEN p.category
               WHEN ua.item_type = 'training' THEN tm.type
               WHEN ua.item_type = 'document' THEN 'Document'
             END as item_category
      FROM user_assignments ua
      LEFT JOIN tasks t ON ua.item_type = 'task' AND ua.item_id = t.id
      LEFT JOIN policies p ON ua.item_type = 'policy' AND ua.item_id = p.id
      LEFT JOIN training_modules tm ON ua.item_type = 'training' AND ua.item_id = tm.id
      LEFT JOIN user_documents ud ON ua.item_type = 'document' AND ua.item_id = ud.id
      WHERE ua.user_id = ?
      ORDER BY ua.assigned_date DESC
    `, [userId]);
    
    console.log('Found assignments:', assignments.length, assignments);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST assign items to user
app.post('/api/assignments', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { userId, items, dueDate } = req.body;
    
    for (const item of items) {
      await db.execute(
        'INSERT INTO user_assignments (user_id, item_type, item_id, assigned_by, due_date, is_required) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, item.type, item.id, req.user.id, dueDate && dueDate.trim() !== '' ? dueDate : null, true]
      );
    }
    
    res.json({ message: 'Items assigned successfully' });
  } catch (error) {
    console.error('Error assigning items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE assignment status
app.put('/api/assignments/:userId/task/:taskId', verifyToken, async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { status } = req.body;
    
    await db.execute(
      'UPDATE user_assignments SET status = ?, completed_date = ? WHERE user_id = ? AND item_type = "task" AND item_id = ?',
      [status, status === 'completed' ? new Date() : null, userId, taskId]
    );
    
    res.json({ message: 'Assignment status updated' });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET common items (visible to all)
app.get('/api/common-items', verifyToken, async (req, res) => {
  try {
    const [policies] = await db.execute('SELECT * FROM policies WHERE is_common = TRUE');
    const [training] = await db.execute('SELECT * FROM training_modules WHERE is_common = TRUE');
    const [tasks] = await db.execute('SELECT * FROM tasks WHERE is_common = TRUE');
    
    res.json({ policies, training, tasks });
  } catch (error) {
    console.error('Error fetching common items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Task Categories Management

// GET all task categories
app.get('/api/task-categories', verifyToken, async (req, res) => {
  try {
    console.log('Fetching task categories...');
    const [categories] = await db.execute('SELECT * FROM task_categories WHERE is_active = TRUE ORDER BY name');
    console.log('Found categories:', categories.length);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching task categories:', error);
    // If table doesn't exist, return empty array
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('Task categories table does not exist, returning empty array');
      return res.json([]);
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE new task category (Admin/HR only)
app.post('/api/task-categories', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { name, description, color } = req.body;
    console.log('Creating category:', { name, description, color, userId: req.user.id });
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO task_categories (name, description, color, created_by) VALUES (?, ?, ?, ?)',
      [name, description || '', color || '#6366f1', req.user.id]
    );
    
    console.log('Insert result:', result);
    
    const [newCategory] = await db.execute('SELECT * FROM task_categories WHERE id = ?', [result.insertId]);
    console.log('New category created:', newCategory[0]);
    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error('Error creating task category:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ message: 'Database table not initialized. Please contact administrator.' });
    }
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// UPDATE task category (Admin/HR only)
app.put('/api/task-categories/:id', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;
    
    await db.execute(
      'UPDATE task_categories SET name = ?, description = ?, color = ? WHERE id = ?',
      [name, description, color, id]
    );
    
    const [updatedCategory] = await db.execute('SELECT * FROM task_categories WHERE id = ?', [id]);
    res.json(updatedCategory[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    console.error('Error updating task category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE task category (Admin/HR only)
app.delete('/api/task-categories/:id', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete - mark as inactive
    await db.execute('UPDATE task_categories SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting task category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cleanup expired MFA sessions periodically
const cleanupExpiredSessions = async () => {
  try {
    const [result] = await db.execute('DELETE FROM mfa_sessions WHERE expires_at < NOW()');
    if (result.affectedRows > 0) {
      console.log(`🧹 Cleaned up ${result.affectedRows} expired MFA sessions`);
    }
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      console.error('Error cleaning up expired sessions:', error.message);
    }
  }
};

// Run cleanup based on environment variable
const cleanupInterval = (parseInt(process.env.MFA_CLEANUP_INTERVAL_HOURS) || 1) * 60 * 60 * 1000;
setInterval(cleanupExpiredSessions, cleanupInterval);

// Import and setup bulk upload functionality
import BulkUploadController from './controllers/bulkUploadController.js';
const bulkUploadController = new BulkUploadController(db);

// Configure secure Excel upload
const excelUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      try {
        const secureFilename = sanitizeFilename(file.originalname);
        cb(null, secureFilename);
      } catch (error) {
        cb(error);
      }
    }
  }),
  limits: { 
    fileSize: 10 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!validateFileType(file, 'excel')) {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  }
});

// Bulk employee upload routes
app.get('/api/employees/template', verifyToken, requireRole(['Admin', 'HR']), (req, res) => {
  bulkUploadController.downloadTemplate(req, res);
});

app.post('/api/employees/bulk-upload', verifyToken, requireRole(['Admin', 'HR']), excelUpload.single('employeeFile'), sanitizeUploadPath, validateUploadSecurity, (req, res) => {
  bulkUploadController.processBulkUpload(req, res);
});

// Global error handler
app.use(globalErrorHandler);

// --- Start the server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log('🔐 MFA system initialized with enhanced security');
  
  // Run initial cleanup after delay to allow database connection
  setTimeout(cleanupExpiredSessions, 30000);
  
  // Start reminder scheduler
  reminderService.startScheduler();
});