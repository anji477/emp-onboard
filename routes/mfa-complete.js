import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Initialize MFA tables
const initMfaTables = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mfa_sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      secret VARCHAR(500) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_expires (expires_at)
    )
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mfa_policies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      role VARCHAR(50) NOT NULL,
      enforced BOOLEAN DEFAULT FALSE,
      grace_period_days INT DEFAULT 7,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

// POST /mfa/setup - Generate QR code and secret
router.post('/setup', verifyToken, async (req, res) => {
  try {
    await initMfaTables(req.db);
    
    const userId = req.user.id;
    const [users] = await req.db.execute('SELECT email FROM users WHERE id = ?', [userId]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `MyApp (${user.email})`,
      issuer: 'MyApp',
      length: 32
    });
    
    // Create MFA session (30 min expiry)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);
    await req.db.execute(
      'INSERT INTO mfa_sessions (id, user_id, secret, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, secret.base32, expiresAt]
    );
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      sessionId,
      qrCode,
      manualEntryKey: secret.base32,
      accountName: `MyApp (${user.email})`
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Setup failed' });
  }
});



// POST /mfa/restart-setup - Restart MFA setup with new session
router.post('/restart-setup', verifyToken, async (req, res) => {
  try {
    await initMfaTables(req.db);
    
    const userId = req.user.id;
    const [users] = await req.db.execute('SELECT email FROM users WHERE id = ?', [userId]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `EmpOnboard (${user.email})`,
      issuer: 'EmpOnboard',
      length: 32
    });
    
    // Create new MFA session (30 min expiry)
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    // Clear old sessions
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);
    
    // Create new session
    await req.db.execute(
      'INSERT INTO mfa_sessions (id, user_id, secret, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, secret.base32, expiresAt]
    );
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      success: true,
      sessionId,
      qrCode,
      secret: secret.base32,
      expiresIn: 30 * 60
    });
  } catch (error) {
    console.error('MFA restart setup error:', error);
    res.status(500).json({ success: false, message: 'Failed to restart MFA setup' });
  }
});

// POST /mfa/verify-setup - Verify MFA setup code
router.post('/verify-setup', verifyToken, async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    
    if (!sessionId || !code) {
      return res.status(400).json({ success: false, message: 'Session ID and code required' });
    }
    
    // Get MFA session
    const [sessions] = await req.db.execute(
      'SELECT * FROM mfa_sessions WHERE id = ? AND user_id = ? AND expires_at > NOW()',
      [sessionId, req.user.id]
    );
    
    if (sessions.length === 0) {
      return res.status(400).json({ success: false, message: 'MFA setup session has expired or is invalid' });
    }
    
    const session = sessions[0];
    
    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: session.secret,
      encoding: 'base32',
      token: code,
      window: 2
    });
    
    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    
    // Enable MFA for user
    await req.db.execute(
      'UPDATE users SET mfa_enabled = TRUE, mfa_secret = ?, mfa_backup_codes = ? WHERE id = ?',
      [session.secret, JSON.stringify(backupCodes), req.user.id]
    );
    
    // Clean up session
    await req.db.execute('DELETE FROM mfa_sessions WHERE id = ?', [sessionId]);
    
    res.json({
      success: true,
      backupCodes,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('MFA verify setup error:', error);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// POST /mfa/force-reregister - Admin force MFA re-registration
router.post('/force-reregister', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    // Reset user MFA
    await req.db.execute(
      'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = ?',
      [userId]
    );
    
    // Clear MFA sessions
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);
    
    res.json({ success: true, message: 'MFA reset for user' });
  } catch (error) {
    console.error('MFA force reregister error:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

export default router;