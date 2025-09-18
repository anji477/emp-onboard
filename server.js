// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import db from './db-mysql.js'; // Import our database connection
import { generateToken, verifyToken, requireRole } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors({ credentials: true, origin: 'http://localhost:5173' })); // Allow requests from our React app
app.use(express.json()); // Allow the server to understand JSON data
app.use(cookieParser()); // Parse cookies
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
app.use(express.static('.')); // Serve static files from current directory

// --- Define API Endpoints Here ---

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// Test database connection
app.get('/api/test', async (req, res) => {
  try {
    const [result] = await db.execute('SELECT 1 as test');
    const [users] = await db.execute('SELECT email, password_hash FROM users');
    const [tasks] = await db.execute('SELECT * FROM tasks');
    res.json({ message: 'Database connected successfully', result, users, tasks });
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
app.get('/api/users/:userId/tasks', async (req, res) => {
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
app.get('/api/users/:userId/progress', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // 1. Get tasks progress
    const [allTasks] = await db.execute('SELECT status FROM tasks WHERE user_id = ?', [userId]);
    const tasksTotal = allTasks.length;
    const tasksCompleted = allTasks.filter(task => 
      task.status === 'Completed' || task.status === 'InProgress'
    ).length;
    
    // 2. Get documents progress
    const [allDocs] = await db.execute('SELECT status FROM user_documents WHERE user_id = ?', [userId]);
    const docsTotal = allDocs.length;
    const docsCompleted = allDocs.filter(doc => 
      doc.status === 'Verified' || doc.status === 'Uploaded'
    ).length;
    
    // 3. Get training progress
    const [allTraining] = await db.execute('SELECT completed FROM user_training_progress WHERE user_id = ?', [userId]);
    const trainingTotal = allTraining.length;
    const trainingCompleted = allTraining.filter(training => training.completed === 1).length;
    
    // Calculate weighted progress (Tasks: 50%, Documents: 30%, Training: 20%)
    const taskProgress = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 50 : 0;
    const docProgress = docsTotal > 0 ? (docsCompleted / docsTotal) * 30 : 0;
    const trainingProgress = trainingTotal > 0 ? (trainingCompleted / trainingTotal) * 20 : 0;
    
    const totalProgress = Math.round(taskProgress + docProgress + trainingProgress);
    
    console.log(`Progress breakdown for user ${userId}:`);
    console.log(`- Tasks: ${tasksCompleted}/${tasksTotal} = ${Math.round(taskProgress)}%`);
    console.log(`- Documents: ${docsCompleted}/${docsTotal} = ${Math.round(docProgress)}%`);
    console.log(`- Training: ${trainingCompleted}/${trainingTotal} = ${Math.round(trainingProgress)}%`);
    console.log(`- Total Progress: ${totalProgress}%`);
    
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
    console.log('Updating task:', id, 'to status:', status);
    
    // Check if task exists first
    const [existingTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const existingTask = existingTasks[0];
    console.log('Existing task:', existingTask);
    
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    const result = await db.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
    console.log('Update result:', result);
    
    const [updatedTasks] = await db.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    const updatedTask = updatedTasks[0];
    console.log('Task updated successfully:', updatedTask);
    
    // Recalculate and update user progress
    const [allUserTasks] = await db.execute('SELECT status FROM tasks WHERE user_id = ?', [updatedTask.user_id]);
    const total = allUserTasks.length;
    const completed = allUserTasks.filter(task => 
      task.status === 'Completed' || 
      task.status === 'completed' || 
      task.status === 'InProgress'
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await db.execute('UPDATE users SET onboarding_progress = ? WHERE id = ?', [progress, updatedTask.user_id]);
    console.log(`Updated progress for user ${updatedTask.user_id}: ${completed}/${total} = ${progress}%`);
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Detailed error updating task:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    
    // Check if user has tasks, if not create some
    const [tasks] = await db.execute('SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', [user.id]);
    if (tasks[0].count === 0) {
      console.log('No tasks found for user', user.id, 'creating default tasks...');
      await db.execute('INSERT INTO tasks (user_id, title, category, due_date, status) VALUES (?, ?, ?, ?, ?)', [user.id, 'Complete profile setup', 'General', '2024-01-15', 'InProgress']);
      await db.execute('INSERT INTO tasks (user_id, title, category, due_date, status) VALUES (?, ?, ?, ?, ?)', [user.id, 'Upload required documents', 'Paperwork', '2024-01-16', 'ToDo']);
      await db.execute('INSERT INTO tasks (user_id, title, category, due_date, status) VALUES (?, ?, ?, ?, ?)', [user.id, 'Complete security training', 'Training', '2024-01-22', 'ToDo']);
      console.log('Created 3 default tasks for user', user.id);
    }
    
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
    // In real app, verify current password and hash new password
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
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, password, role || 'Employee', avatar_url, team, job_title, start_date, 0]
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
    
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress, invitation_token, invitation_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, 'TEMP_PASSWORD', role || 'Employee', avatar_url, team, job_title, start_date, 0, token, expiresAt.toISOString()]
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
    
    // Update user with password and clear invitation token
    await db.execute(
      'UPDATE users SET password_hash = ?, invitation_token = NULL, invitation_expires = NULL WHERE id = ?',
      [password, user.id]
    );
    
    res.json({ message: 'Password set successfully. You can now login.' });
  } catch (error) {
    console.error('Error setting password:', error);
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
    const { email, password } = req.body;
    
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
    
    console.log('Password check:', password, 'vs', user.password_hash);
    // Check password (in production, use bcrypt to compare hashed passwords)
    if (user.password_hash !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Return user data without password
    const { password_hash, invitation_token, invitation_expires, ...userData } = user;
    
    // Generate JWT token
    const token = generateToken(userData);
    
    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
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

// DELETE user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM users WHERE id = ?', [id]);
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

// GET all policies
app.get('/api/policies', verifyToken, async (req, res) => {
  try {
    const [policies] = await db.execute('SELECT * FROM policies');
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST new policy
app.post('/api/policies', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { title, category, summary, content } = req.body;
    
    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO policies (title, category, summary, content) VALUES (?, ?, ?, ?)',
      [title, category, summary || '', content || '']
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
    const { title, category, summary, content } = req.body;
    
    await db.execute(
      'UPDATE policies SET title = ?, category = ?, summary = ?, content = ? WHERE id = ?',
      [title, category, summary, content, id]
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


// --- Start the server ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});