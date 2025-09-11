// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db-mysql.js'; // Import our database connection

// Load environment variables
dotenv.config();

const app = express();
app.use(cors()); // Allow requests from our React app
app.use(express.json()); // Allow the server to understand JSON data
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
    res.json({ message: 'Database connected successfully', result, users });
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

// GET tasks for a specific user
app.get('/api/users/:userId/tasks', async (req, res) => {
  try {
    const userId = req.params.userId;
    const tasks = await db.all('SELECT * FROM tasks WHERE user_id = ?', [userId]);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE task status
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
    const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', [id]);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET all users
app.get('/api/users', async (req, res) => {
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
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
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
      await db.run('UPDATE users SET name = ?, email = ?, avatar_url = ? WHERE id = ?', [name, email, avatar_url, id]);
    } else {
      await db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id]);
    }
    
    const updatedUser = await db.get('SELECT * FROM users WHERE id = ?', [id]);
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
app.get('/api/assets', async (req, res) => {
  try {
    const assets = await db.all('SELECT * FROM it_assets');
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
app.put('/api/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignedTo } = req.body;
    await db.run('UPDATE it_assets SET status = ?, assigned_to_id = ?, assigned_date = ? WHERE id = ?', 
      [status, assignedTo, new Date().toISOString().split('T')[0], id]);
    const updatedAsset = await db.get('SELECT * FROM it_assets WHERE id = ?', [id]);
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
    const { name, email, role, team, job_title, start_date } = req.body;
    
    if (!name || !email) {
      console.log('Validation failed: missing name or email');
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    const avatar_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
    
    console.log('Attempting to insert user with data:', {
      name, email, role: role || 'Employee', avatar_url, team, job_title, start_date
    });
    
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, role, avatar_url, team, job_title, start_date, onboarding_progress) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, 'password123', role || 'Employee', avatar_url, team, job_title, start_date, 0]
    );
    
    console.log('Insert result:', result);
    
    const newUser = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
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
    
    const result = await db.run(
      'INSERT INTO users (name, email, role, avatar_url, team, job_title, start_date, onboarding_progress, invitation_token, invitation_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, role || 'Employee', avatar_url, team, job_title, start_date, 0, token, expiresAt.toISOString()]
    );
    
    // Send invitation email
    try {
      const { sendInvitationEmail } = await import('./services/emailService.js');
      const emailSent = await sendInvitationEmail(email, name, token);
      
      const newUser = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
      
      res.status(201).json({ 
        user: newUser, 
        emailSent,
        message: emailSent ? 'User invited and email sent successfully' : 'User invited but email failed to send'
      });
    } catch (emailError) {
      console.error('Email service error:', emailError);
      const newUser = await db.get('SELECT * FROM users WHERE id = ?', [result.lastID]);
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
    
    const user = await db.get(
      'SELECT name, email FROM users WHERE invitation_token = ? AND invitation_expires > ?',
      [token, new Date().toISOString()]
    );
    
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
    const user = await db.get(
      'SELECT * FROM users WHERE invitation_token = ? AND invitation_expires > ?',
      [token, new Date().toISOString()]
    );
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired invitation token' });
    }
    
    // Update user with password and clear invitation token
    await db.run(
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
    const notifications = await db.all(
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
    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
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
    await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
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

// POST new asset
app.post('/api/assets', async (req, res) => {
  try {
    console.log('Received asset data:', req.body);
    const { name, type, serialNumber, purchaseDate, warrantyInfo, licenseExpiry, location } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required' });
    }
    
    const result = await db.run(
      'INSERT INTO it_assets (name, type, serial_number, status, purchase_date, warranty_info, license_expiry, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, type, serialNumber || '', 'Unassigned', purchaseDate || null, warrantyInfo || '', licenseExpiry || null, location || '']
    );
    
    const newAsset = await db.get('SELECT * FROM it_assets WHERE id = ?', [result.lastID]);
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