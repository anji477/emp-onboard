// routes/mfa.js
import express from 'express';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Start MFA setup - Create session with TOTP secret
router.post('/start-setup', async (req, res) => {
  try {
    const { userEmail, sessionToken: existingToken } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email required' });
    }

    // Get user by email
    const [users] = await req.db.execute('SELECT id, name, email FROM users WHERE email = ?', [userEmail]);
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

    // Clean up any existing sessions for this user
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [user.id]);

    // Create new session
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, sessionToken, secret.base32, expiresAt]
    );

    res.json({
      sessionToken,
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url,
      accountName: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER,
      userEmail: user.email,
      userName: user.name
    });
  } catch (error) {
    console.error('MFA setup start error:', error);
    res.status(500).json({ message: 'Failed to start MFA setup' });
  }
});

// Validate session token
router.post('/validate-session', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.json({ valid: false, expired: true });
    }

    const [sessions] = await req.db.execute(
      'SELECT user_id, expires_at FROM mfa_sessions WHERE session_token = ?',
      [sessionToken]
    );

    if (sessions.length === 0) {
      return res.json({ valid: false, expired: true });
    }

    const session = sessions[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      // Clean up expired session
      await req.db.execute('DELETE FROM mfa_sessions WHERE session_token = ?', [sessionToken]);
      return res.json({ valid: false, expired: true });
    }

    res.json({ valid: true, userId: session.user_id });
  } catch (error) {
    console.error('Session validation error:', error);
    res.json({ valid: false, expired: true });
  }
});

// Restart MFA setup (generate new session)
router.post('/restart-setup', async (req, res) => {
  try {
    const { sessionToken, userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ message: 'User email required', requiresLogin: true });
    }

    // Get user by email
    const [users] = await req.db.execute('SELECT id, name, email FROM users WHERE email = ?', [userEmail]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ message: 'User not found', requiresLogin: true });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER,
      length: 32
    });

    // Generate new session token
    const newSessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Clean up any existing sessions for this user
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [user.id]);

    // Create new session
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, newSessionToken, secret.base32, expiresAt]
    );

    res.json({
      sessionToken: newSessionToken,
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      manualEntryKey: secret.base32,
      accountName: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER,
      userEmail: user.email
    });
  } catch (error) {
    console.error('MFA restart setup error:', error);
    res.status(500).json({ message: 'Failed to restart setup' });
  }
});

// Setup authenticator (for optional MFA)
router.post('/setup-authenticator', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await req.db.execute('SELECT email FROM users WHERE id = ?', [userId]);
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

    // Clean up any existing sessions for this user
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);

    // Create new session
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?)',
      [userId, sessionToken, secret.base32, expiresAt]
    );

    res.json({
      sessionToken,
      secret: secret.base32,
      qrCode: secret.otpauth_url,
      manualEntryKey: secret.base32,
      accountName: `${process.env.MFA_ISSUER} (${user.email})`,
      issuer: process.env.MFA_ISSUER,
      userEmail: user.email
    });
  } catch (error) {
    console.error('MFA setup authenticator error:', error);
    res.status(500).json({ message: 'Failed to setup authenticator' });
  }
});

// Complete MFA setup (method selection)
router.post('/complete-setup', async (req, res) => {
  try {
    const { sessionToken, method } = req.body;

    if (!sessionToken) {
      return res.status(400).json({ message: 'Session token required' });
    }

    // Get session with existing secret
    const [sessions] = await req.db.execute(
      'SELECT user_id, secret, expires_at FROM mfa_sessions WHERE session_token = ?',
      [sessionToken]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid session token', 
        expired: true 
      });
    }

    const session = sessions[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      await req.db.execute('DELETE FROM mfa_sessions WHERE session_token = ?', [sessionToken]);
      return res.status(400).json({ 
        message: 'Setup session has expired', 
        expired: true 
      });
    }

    // Get user info
    const [users] = await req.db.execute('SELECT email FROM users WHERE id = ?', [session.user_id]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If method is provided and is authenticator, or if no method provided (default to authenticator)
    if (!method || method === 'authenticator') {
      // Use existing secret from session or generate new one
      let secret = session.secret;
      let qrCodeUrl;
      
      if (!secret) {
        const newSecret = speakeasy.generateSecret({
          name: `${process.env.MFA_ISSUER} (${user.email})`,
          issuer: process.env.MFA_ISSUER,
          length: 32
        });
        secret = newSecret.base32;
        qrCodeUrl = newSecret.otpauth_url;
        
        // Update session with secret
        await req.db.execute(
          'UPDATE mfa_sessions SET secret = ? WHERE session_token = ?',
          [secret, sessionToken]
        );
      } else {
        // Generate QR code URL from existing secret
        qrCodeUrl = speakeasy.otpauthURL({
          secret: secret,
          label: `${process.env.MFA_ISSUER} (${user.email})`,
          issuer: process.env.MFA_ISSUER,
          encoding: 'base32'
        });
      }

      res.json({
        success: true,
        secret: secret,
        qrCode: qrCodeUrl,
        qrCodeUrl: qrCodeUrl,
        manualEntryKey: secret,
        accountName: `${process.env.MFA_ISSUER} (${user.email})`,
        issuer: process.env.MFA_ISSUER,
        userEmail: user.email
      });
    } else {
      res.status(400).json({ message: 'Unsupported method. Only authenticator is supported.' });
    }
  } catch (error) {
    console.error('MFA complete setup error:', error);
    res.status(500).json({ message: 'Failed to complete setup' });
  }
});

// Verify setup code and complete MFA setup
router.post('/verify-setup', async (req, res) => {
  try {
    const { sessionToken, code, token } = req.body;
    const verificationCode = code || token;

    if (!sessionToken || !verificationCode) {
      return res.status(400).json({ message: 'Session token and code required' });
    }

    // Get session with secret
    const [sessions] = await req.db.execute(
      'SELECT user_id, secret, expires_at FROM mfa_sessions WHERE session_token = ?',
      [sessionToken]
    );

    if (sessions.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid session token', 
        expired: true 
      });
    }

    const session = sessions[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      await req.db.execute('DELETE FROM mfa_sessions WHERE session_token = ?', [sessionToken]);
      return res.status(400).json({ 
        message: 'Setup session has expired', 
        expired: true 
      });
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: session.secret,
      encoding: 'base32',
      token: verificationCode,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable MFA for user
    await req.db.execute(
      'UPDATE users SET mfa_enabled = TRUE, mfa_secret = ?, mfa_backup_codes = ?, mfa_setup_completed = TRUE WHERE id = ?',
      [session.secret, JSON.stringify(backupCodes), session.user_id]
    );

    // Delete session (single-use)
    await req.db.execute('DELETE FROM mfa_sessions WHERE session_token = ?', [sessionToken]);

    res.json({
      success: true,
      backupCodes,
      message: 'MFA setup completed successfully'
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Get MFA policy
router.get('/policy', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const [settings] = await req.db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "mfa_policy"'
    );
    
    if (settings.length > 0) {
      const policy = JSON.parse(settings[0].setting_value);
      res.json(policy);
    } else {
      res.json({
        enforced: false,
        require_for_roles: [],
        grace_period_days: 7
      });
    }
  } catch (error) {
    console.error('MFA policy error:', error);
    res.status(500).json({ message: 'Failed to get MFA policy' });
  }
});

// Update MFA policy
router.put('/policy', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const policy = req.body;
    
    await req.db.execute(
      'INSERT INTO organization_settings (setting_key, setting_value, category, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['mfa_policy', JSON.stringify(policy), 'security', 'Multi-factor authentication policy settings']
    );
    
    res.json({ success: true, message: 'MFA policy updated successfully' });
  } catch (error) {
    console.error('MFA policy update error:', error);
    res.status(500).json({ message: 'Failed to update MFA policy' });
  }
});

// Reset user MFA (Admin only)
router.post('/reset/:userId', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Reset user's MFA completely
    await req.db.execute(
      'UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL, mfa_setup_completed = FALSE WHERE id = ?',
      [userId]
    );
    
    // Clear all MFA sessions
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);
    
    res.json({ success: true, message: 'User MFA reset successfully' });
  } catch (error) {
    console.error('MFA reset error:', error);
    res.status(500).json({ message: 'Failed to reset user MFA' });
  }
});

export default router;