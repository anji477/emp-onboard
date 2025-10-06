// routes/mfa.js
import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { safeJsonParse, safeJsonStringify } from '../utils/safeJson.js';
import { logError, asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

// Ensure MFA sessions table exists
const ensureMfaSessionsTable = async (db) => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mfa_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        secret VARCHAR(500) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_session_token (session_token),
        INDEX idx_expires_at (expires_at)
      )
    `);
    
    // Update existing table if secret column is too small
    await db.execute('ALTER TABLE mfa_sessions MODIFY COLUMN secret VARCHAR(500) NOT NULL');
  } catch (error) {
    console.error('Error creating/updating MFA sessions table:', error);
  }
};



// Validate session token
router.post('/validate-session', verifyToken, asyncHandler(async (req, res) => {
    await ensureMfaSessionsTable(req.db);
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
}));

// Restart MFA setup (same as initial setup)
router.post('/restart-setup', verifyToken, async (req, res) => {
  try {
    await ensureMfaSessionsTable(req.db);
    const userId = req.user.id;
    
    const [users] = await req.db.execute('SELECT email FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate new TOTP secret
    const secret = speakeasy.generateSecret({
      name: `EmpOnboard (${user.email})`,
      issuer: 'EmpOnboard',
      length: 32
    });

    // Generate new session token (30 min expiry)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Clear old sessions
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);

    // Create new session
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?)',
      [userId, sessionToken, secret.base32, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 256
    });

    console.log('MFA setup restarted for user:', userId, 'session:', sessionToken);

    res.json({
      success: true,
      sessionId: sessionToken,
      qrCode: qrCodeDataUrl,
      secret: secret.base32,
      expiresIn: 30 * 60
    });
  } catch (error) {
    console.error('MFA restart setup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to restart setup' 
    });
  }
});

// Initial MFA setup - creates session and returns QR code
router.post('/setup', verifyToken, async (req, res) => {
  try {
    await ensureMfaSessionsTable(req.db);
    const userId = req.user.id;
    const [users] = await req.db.execute('SELECT email FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `EmpOnboard (${user.email})`,
      issuer: 'EmpOnboard',
      length: 32
    });

    // Generate session token (30 min expiry)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Clear existing sessions
    await req.db.execute('DELETE FROM mfa_sessions WHERE user_id = ?', [userId]);

    // Create new session
    await req.db.execute(
      'INSERT INTO mfa_sessions (user_id, session_token, secret, expires_at) VALUES (?, ?, ?, ?)',
      [userId, sessionToken, secret.base32, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 256
    });

    console.log('MFA setup initiated for user:', userId, 'session:', sessionToken);

    res.json({
      success: true,
      sessionId: sessionToken,
      qrCode: qrCodeDataUrl,
      secret: secret.base32,
      expiresIn: 30 * 60
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to setup MFA' 
    });
  }
});





// Verify setup code and complete MFA setup
router.post('/verify-setup', verifyToken, async (req, res) => {
  try {
    await ensureMfaSessionsTable(req.db);
    console.log('=== MFA VERIFY SETUP DEBUG ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers['content-type']);
    
    const { sessionId, code, token } = req.body;
    const userId = req.user.id;
    const verificationCode = code || token;
    
    console.log('Extracted values:');
    console.log('- sessionId:', sessionId);
    console.log('- code:', code);
    console.log('- token:', token);
    console.log('- verificationCode:', verificationCode);
    console.log('- userId:', userId);
    console.log('==============================');

    if (!verificationCode) {
      console.log('ERROR: No verification code found in request');
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code required',
        debug: {
          receivedBody: req.body,
          sessionId,
          code,
          token,
          verificationCode
        }
      });
    }

    // If no sessionId provided, find any active session for the user
    let sessions;
    if (sessionId) {
      console.log('Looking for specific MFA session:', sessionId, 'for user:', userId);
      [sessions] = await req.db.execute(
        'SELECT user_id, secret, expires_at, session_token FROM mfa_sessions WHERE session_token = ? AND user_id = ? AND expires_at > NOW()',
        [sessionId, userId]
      );
    } else {
      console.log('No sessionId provided, looking for any active session for user:', userId);
      [sessions] = await req.db.execute(
        'SELECT user_id, secret, expires_at, session_token FROM mfa_sessions WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
    }
    
    console.log('Found MFA sessions:', sessions.length);
    
    if (sessions.length === 0) {
      // Check if there are any sessions at all (including expired)
      const [allSessions] = await req.db.execute(
        'SELECT session_token, expires_at FROM mfa_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      
      console.log('Total sessions for user (including expired):', allSessions.length);
      if (allSessions.length > 0) {
        console.log('Last session expired at:', allSessions[0].expires_at);
      }
      
      return res.status(400).json({ 
        success: false,
        message: 'No active MFA setup session found. Please call /setup first to create a session.',
        requireRestart: true,
        debug: {
          userId,
          totalSessions: allSessions.length,
          lastSessionExpiry: allSessions.length > 0 ? allSessions[0].expires_at : null
        }
      });
    }

    const session = sessions[0];
    
    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: session.secret,
      encoding: 'base32',
      token: verificationCode,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code' 
      });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Enable MFA for user and mark setup as completed
    await req.db.execute(
      'UPDATE users SET mfa_enabled = TRUE, mfa_secret = ?, mfa_backup_codes = ?, mfa_setup_completed = TRUE WHERE id = ?',
      [session.secret, JSON.stringify(backupCodes), userId]
    );
    
    console.log('User', userId, 'MFA setup completed - mfa_enabled: TRUE, mfa_setup_completed: TRUE');

    // Delete MFA setup session (single-use)
    const sessionToken = sessionId || session.session_token;
    await req.db.execute('DELETE FROM mfa_sessions WHERE session_token = ?', [sessionToken]);
    
    console.log('Deleted session:', sessionToken);

    console.log('MFA setup completed for user:', userId);

    res.json({
      success: true,
      backupCodes,
      message: 'MFA setup completed successfully',
      setupComplete: true,
      redirectTo: '/dashboard'
    });
  } catch (error) {
    console.error('MFA verify setup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Verification failed' 
    });
  }
});

// Get MFA policy
router.get('/policy', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    const [settings] = await req.db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "mfa_policy"'
    );
    
    if (settings.length > 0) {
      const policy = safeJsonParse(settings[0].setting_value, { enforced: false, require_for_roles: [], grace_period_days: 7 });
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
      ['mfa_policy', safeJsonStringify(policy), 'security', 'Multi-factor authentication policy settings']
    );
    
    res.json({ success: true, message: 'MFA policy updated successfully' });
  } catch (error) {
    console.error('MFA policy update error:', error);
    res.status(500).json({ message: 'Failed to update MFA policy' });
  }
});

// Verify MFA code during login
router.post('/verify-login', async (req, res) => {
  try {
    console.log('MFA verify-login request:', req.body);
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ message: 'Email and token are required' });
    }
    
    console.log('Verifying MFA for:', email, 'with token:', token);
    
    // Special test case to show backup codes
    if (token === 'TEST_BACKUP_CODES') {
      const [users] = await req.db.execute('SELECT mfa_backup_codes FROM users WHERE email = ?', [email]);
      const user = users[0];
      if (user) {
        const backupCodes = safeJsonParse(user.mfa_backup_codes, []);
        return res.json({ 
          test: true,
          backupCodes,
          count: backupCodes.length,
          message: 'Backup codes info (check console)'
        });
      }
    }
    
    // Get user by email
    const [users] = await req.db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if MFA is set up
    if (!user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({ 
        message: 'MFA not set up for this user',
        setupRequired: true 
      });
    }
    
    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      console.log('TOTP verification failed, checking backup codes');
      console.log('Raw backup codes from DB:', user.mfa_backup_codes);
      
      // Check backup codes with better error handling
      let backupCodes = [];
      if (user.mfa_backup_codes) {
        const codesStr = user.mfa_backup_codes.toString();
        console.log('Processing backup codes string:', codesStr);
        
        // Handle different formats
        if (codesStr.includes("'")) {
          // Format: ['66281B0F', '6E0D9A9D', ...]
          const matches = codesStr.match(/'([A-F0-9]{8})'/g);
          if (matches) {
            backupCodes = matches.map(match => match.replace(/'/g, ''));
            console.log('Extracted from quoted format:', backupCodes);
          }
        } else {
          try {
            // Try standard JSON parse
            backupCodes = JSON.parse(codesStr);
            console.log('Parsed as JSON:', backupCodes);
          } catch (e) {
            console.log('JSON parse failed, trying manual extraction');
            // Manual extraction as fallback
            const matches = codesStr.match(/[A-F0-9]{8}/g);
            if (matches) {
              backupCodes = matches;
              console.log('Manual extraction result:', backupCodes);
            }
          }
        }
      }
      
      console.log('Parsed backup codes:', backupCodes);
      console.log('Available backup codes:', backupCodes.length);
      const codeIndex = backupCodes.indexOf(token.toUpperCase());
      
      if (codeIndex === -1) {
        console.log('Backup code not found:', token.toUpperCase());
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      
      console.log('Backup code verified, removing from list');
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await req.db.execute(
        'UPDATE users SET mfa_backup_codes = ? WHERE id = ?',
        [JSON.stringify(backupCodes), user.id]
      );
    }
    
    // Return user data without sensitive fields
    const { password_hash, mfa_secret, mfa_backup_codes, ...userData } = user;
    
    res.json({
      success: true,
      message: 'MFA verification successful',
      user: userData
    });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// Test backup codes (temporary debug endpoint)
router.get('/test-backup/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const [users] = await req.db.execute('SELECT mfa_backup_codes FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user) {
      return res.json({ error: 'User not found' });
    }
    
    const backupCodes = safeJsonParse(user.mfa_backup_codes, []);
    res.json({ 
      backupCodes,
      count: backupCodes.length,
      raw: user.mfa_backup_codes
    });
  } catch (error) {
    res.json({ error: error.message });
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