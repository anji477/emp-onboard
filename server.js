// server.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import fs from 'fs';
import db from './db-mysql.js'; // Import our database connection
import { generateToken, verifyToken, requireRole } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors({ credentials: true, origin: ['http://localhost:5173', 'http://192.168.1.140:5173'] })); // Allow requests from localhost and server IP
app.use(express.json()); // Allow the server to understand JSON data
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
    }
  }
}));

// Add database connection to all requests
app.use((req, res, next) => {
  req.db = db;
  next();
});



// Create uploads directory
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
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
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
    fileFilter: (req, file, cb) => {
        // Allow all files for training uploads
        if (file.fieldname === 'trainingFile') {
            return cb(null, true);
        }
        
        // Allow PDF/DOC files for policy uploads
        if (file.fieldname === 'policyFile') {
            const allowedTypes = /\.(pdf|doc|docx)$/i;
            if (allowedTypes.test(file.originalname)) {
                return cb(null, true);
            } else {
                return cb(new Error('Only PDF, DOC, and DOCX files are allowed for policies'));
            }
        }
        
        // Original validation for document uploads
        const allowedExtensions = /\.(pdf|doc|docx|mp4|avi|mov|wmv|flv|webm)$/i;
        const extname = allowedExtensions.test(file.originalname);
        const allowedMimes = /^(application|video)\//;
        const mimetype = allowedMimes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    }
});

// --- Define API Endpoints Here ---

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const [result] = await db.execute('SELECT 1 as test');
    const [users] = await db.execute('SELECT id, name, email FROM users');
    const [tasks] = await db.execute('SELECT * FROM tasks');
    const [assignments] = await db.execute('SELECT * FROM user_assignments');
    res.json({ message: 'Database connected successfully', result, users, tasks, assignments });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const [tasks] = await db.execute('SELECT * FROM tasks');
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all tasks for current user
app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const [tasks] = await db.execute('SELECT * FROM tasks WHERE user_id = ?', [req.user.id]);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET tasks for a specific user
app.get('/api/users/:userId/tasks', verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const [tasks] = await db.execute('SELECT * FROM tasks WHERE user_id = ?', [userId]);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
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
    console.error('Error calculating progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE task status
app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const [existingTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const existingTask = existingTasks[0];
    
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    await db.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
    
    // Recalculate user progress
    const [allUserTasks] = await db.execute('SELECT status FROM tasks WHERE user_id = ?', [existingTask.user_id]);
    const total = allUserTasks.length;
    const completed = allUserTasks.filter(task => 
      task.status === 'Completed' || task.status === 'InProgress'
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await db.execute('UPDATE users SET onboarding_progress = ? WHERE id = ?', [progress, existingTask.user_id]);
    
    const [updatedTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const updatedTask = updatedTasks[0];
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGOUT endpoint
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
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
    
    // New users start with 0% progress - no automatic tasks created
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
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

// GET all users
app.get('/api/users', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const [users] = await db.execute('SELECT * FROM users');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET user by ID
app.get('/api/users/:id', async (req, res) => {
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
app.put('/api/users/:id', async (req, res) => {
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

// UPDATE user password
app.put('/api/users/:id/password', async (req, res) => {
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
    
    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedNewPassword, id]);
    
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
app.post('/api/users', async (req, res) => {
  try {
    console.log('POST /api/users - Request body:', req.body);
    const { name, email, password, role, team, job_title, start_date } = req.body;
    
    if (!name || !email || !password) {
      console.log('Validation failed: missing name, email, or password');
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    
    console.log('Attempting to insert user with data:', {
      name, email, role: role || 'Employee', avatar_url, team, job_title, start_date
    });
    
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'Employee', avatar_url, team, job_title, start_date, 0]
    );
    
    console.log('Insert result:', result);
    
    const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const newUser = newUsers[0];
    console.log('Retrieved new user:', newUser);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Detailed error creating user:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// INVITE user
app.post('/api/users/invite', async (req, res) => {
  try {
    const { name, email, role, team, job_title, start_date } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    // Generate invitation token
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    
    // Hash temporary password
    const tempHashedPassword = await bcrypt.hash('TEMP_PASSWORD', 12);
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress, invitation_token, invitation_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, tempHashedPassword, role || 'Employee', avatar_url, team, job_title, start_date, 0, token, expiresAt.toISOString()]
    );
    
    // Send invitation email
    try {
      const { sendInvitationEmail } = await import('./services/emailService.js');
      const emailSent = await sendInvitationEmail(email, name, token);
      
      const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      const newUser = newUsers[0];
      
      res.status(201).json({ 
        user: newUser, 
        emailSent,
        message: emailSent ? 'User invited and email sent successfully' : 'User invited but email failed to send'
      });
    } catch (emailError) {
      console.error('Email service error:', emailError);
      const [newUsers] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
      const newUser = newUsers[0];
      res.status(201).json({ 
        user: newUser, 
        emailSent: false,
        message: 'User invited but email service unavailable'
      });
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// VERIFY invitation token
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

// SETUP password
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

// FORGOT password
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await db.execute(
      'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [resetToken, expiresAt.toISOString(), user.id]
    );
    
    // Try to send email
    try {
      const { sendResetEmail } = await import('./services/emailService.js');
      await sendResetEmail(email, user.name, resetToken);
      res.json({ message: 'Password reset link sent to your email' });
    } catch (emailError) {
      console.error('Email service error:', emailError);
      console.log(`Reset token: ${resetToken} (In production, this would be emailed)`);
      res.json({ message: `Reset token generated but email service unavailable. Reset token: ${resetToken}` });
    }
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET password
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
app.get('/api/notifications/:userId', async (req, res) => {
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
app.put('/api/notifications/:id/read', async (req, res) => {
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
app.put('/api/notifications/user/:userId/read-all', async (req, res) => {
  try {
    const { userId } = req.params;
    await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN authentication
app.post('/api/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    console.log('Login attempt for:', email);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Return user data without password
    const { password_hash, invitation_token, invitation_expires, ...userData } = user;
    
    // Generate JWT token
    const token = generateToken(userData);
    
    // Set HTTP-only cookie with dynamic expiration
    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 24 hours
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieMaxAge
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
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET user progress
app.post('/api/users/:id/reset-progress', async (req, res) => {
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
app.delete('/api/users/:id', async (req, res) => {
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
    
    res.json({ message: 'Settings initialized successfully' });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({ message: 'Failed to initialize settings' });
  }
});

// Check maintenance mode status
app.get('/api/maintenance-status', async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "maintenance_mode"'
    );
    
    if (settings.length > 0) {
      const maintenanceMode = JSON.parse(settings[0].setting_value);
      res.json(maintenanceMode);
    } else {
      res.json({ enabled: false, message: '' });
    }
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    res.json({ enabled: false, message: '' });
  }
});

// GET organization settings (Admin only)
app.get('/api/settings', verifyToken, requireRole(['Admin']), getSettings);

// UPDATE organization settings (Admin only)
app.put('/api/settings', verifyToken, requireRole(['Admin']), updateSettings);

// Test email configuration
app.post('/api/test-email', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { testEmailConfig } = await import('./services/emailService.js');
    const result = await testEmailConfig();
    res.json(result);
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ success: false, message: 'Email service unavailable' });
  }
});

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
app.post('/api/policies/upload', verifyToken, requireRole(['Admin', 'HR']), upload.single('policyFile'), async (req, res) => {
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

    const fileUrl = `/uploads/${req.file.filename}`;
    console.log('File URL:', fileUrl);
    
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
    console.error('Policy upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});



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

// Update document status (verify/reject)
app.put('/api/documents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    await db.execute(
      'UPDATE user_documents SET status = ?, action_date = CURDATE(), rejection_reason = ? WHERE id = ?',
      [status, rejectionReason || null, id]
    );
    
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
app.post('/api/training/upload', upload.fields([{name: 'trainingFile', maxCount: 1}, {name: 'thumbnail', maxCount: 1}]), async (req, res) => {
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
    if (trainingFile.size > 100 * 1024 * 1024) {
      console.log('File too large:', trainingFile.size);
      return res.status(400).json({ error: 'File size must be less than 100MB' });
    }

    const fileUrl = `/uploads/${trainingFile.filename}`;
    let thumbnailUrl = 'https://picsum.photos/400/225?random=' + Date.now();
    
    if (thumbnailFile) {
      thumbnailUrl = `/uploads/${thumbnailFile.filename}`;
      console.log('Custom thumbnail uploaded:', thumbnailUrl);
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
    console.error('Training upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

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
app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
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

    const fileUrl = `/uploads/${req.file.filename}`;
    
    console.log('Inserting document into database:', {
      userId,
      documentName,
      fileUrl,
      originalName: req.file.originalname
    });
    
    const [result] = await db.execute(
      'INSERT INTO user_documents (user_id, name, status, file_url, file_name, file_size, file_type, uploaded_at) VALUES (?, ?, "Uploaded", ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE status = "Uploaded", file_url = VALUES(file_url), file_name = VALUES(file_name), file_size = VALUES(file_size), file_type = VALUES(file_type), uploaded_at = NOW(), action_date = CURDATE()',
      [userId, documentName, fileUrl, req.file.originalname, req.file.size, req.file.mimetype]
    );

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
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

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
        [userId, item.type, item.id, req.user.id, dueDate, true]
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

// --- Start the server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});