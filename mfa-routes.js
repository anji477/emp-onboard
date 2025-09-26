import express from 'express';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { verifyToken, requireRole } from './middleware/auth.js';

const router = express.Router();

// Generate MFA setup session
router.post('/mfa/start-setup', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await req.db.execute('SELECT name, email FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER,
      length: 32
    });

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store setup session
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE session_token = VALUES(session_token), secret = VALUES(secret), expires_at = VALUES(expires_at)',
      [userId, sessionToken, secret.base32, expiresAt]
    );

    res.json({
      sessionToken,
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      accountName: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ message: 'Failed to start MFA setup' });
  }
});

// Validate session token
router.post('/mfa/validate-session', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ valid: false, message: 'Session token required' });
    }

    const [sessions] = await req.db.execute(
      'SELECT user_id, expires_at FROM mfa_sessions WHERE session_token = ? AND expires_at > NOW()',
      [sessionToken]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        expired: true,
        message: 'Session expired or invalid' 
      });
    }

    res.json({ valid: true, userId: sessions[0].user_id });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ valid: false, message: 'Validation failed' });
  }
});

// Restart MFA setup
router.post('/mfa/restart-setup', async (req, res) => {
  try {
    const { sessionToken, userEmail } = req.body;
    let userId;

    // Try to find user by session token or email
    if (sessionToken) {
      const [sessions] = await req.db.execute('SELECT user_id FROM mfa_sessions WHERE session_token = ?', [sessionToken]);
      if (sessions.length > 0) userId = sessions[0].user_id;
    }

    if (!userId && userEmail) {
      const [users] = await req.db.execute('SELECT id FROM users WHERE email = ?', [userEmail]);
      if (users.length > 0) userId = users[0].id;
    }

    if (!userId) {
      return res.status(400).json({ message: 'Cannot identify user', requiresLogin: true });
    }

    // Get user details
    const [users] = await req.db.execute('SELECT name, email FROM users WHERE id = ?', [userId]);
    const user = users[0];

    // Generate new secret and session
    const secret = speakeasy.generateSecret({
      name: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER,
      length: 32
    });

    const newSessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Replace old session
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?)',
      [userId, newSessionToken, secret.base32, expiresAt]
    );

    res.json({
      success: true,
      sessionToken: newSessionToken,
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      accountName: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER
    });
  } catch (error) {
    console.error('Restart setup error:', error);
    res.status(500).json({ message: 'Failed to restart setup' });
  }
});

// Verify MFA setup
router.post('/mfa/verify-setup', async (req, res) => {
  try {
    const { sessionToken, code } = req.body;

    if (!sessionToken || !code) {
      return res.status(400).json({ message: 'Session token and code required' });
    }

    // Get session
    const [sessions] = await req.db.execute(
      'SELECT user_id, secret, expires_at FROM mfa_sessions WHERE session_token = ? AND expires_at > NOW()',
      [sessionToken]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ 
        message: 'Session expired', 
        expired: true 
      });
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
      return res.status(400).json({ message: 'Invalid code' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable MFA
    await req.db.execute(
      'UPDATE users SET mfa_enabled = TRUE, mfa_secret = ?, mfa_backup_codes = ?, mfa_setup_completed = TRUE WHERE id = ?',
      [session.secret, JSON.stringify(backupCodes), session.user_id]
    );

    // Delete session (single-use)
    await req.db.execute('DELETE FROM mfa_sessions WHERE session_token = ?', [sessionToken]);

    res.json({
      success: true,
      backupCodes,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Admin: Reset user MFA
router.post('/users/:id/reset-mfa', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;

    await req.db.execute(
      'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL, mfa_setup_completed = FALSE WHERE id = ?',
      [id]
    );

    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [id]);

    res.json({ success: true, message: 'MFA reset successfully' });
  } catch (error) {
    console.error('MFA reset error:', error);
    res.status(500).json({ message: 'Failed to reset MFA' });
  }
});

export default router;