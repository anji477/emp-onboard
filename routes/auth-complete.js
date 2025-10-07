import express from 'express';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { generateToken } from '../middleware/auth.js';
import { safeJsonParse } from '../utils/safeJson.js';

const router = express.Router();

// POST /login - Enhanced login with MFA
router.post('/login', async (req, res) => {
  try {
    const { email, password, mfaCode } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user
    const [users] = await req.db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if MFA is enforced for user role
    const [policies] = await req.db.execute(
      'SELECT enforced FROM mfa_policies WHERE role = ?', 
      [user.role]
    );
    const mfaEnforced = policies[0]?.enforced || false;
    
    // If MFA not set up but enforced, require setup
    if (mfaEnforced && !user.mfa_enabled) {
      const tempToken = generateToken({ id: user.id, email: user.email, temp: true });
      
      res.cookie('tempToken', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 60 * 1000 // 30 minutes
      });
      
      return res.json({
        requiresMfaSetup: true,
        message: 'MFA setup required for your role'
      });
    }
    
    // If MFA enabled, require verification
    if (user.mfa_enabled) {
      if (!mfaCode) {
        return res.json({
          requiresMfaCode: true,
          message: 'MFA code required'
        });
      }
      
      // Verify MFA code
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaCode,
        window: 2
      });
      
      if (!verified) {
        // Check backup codes
        const backupCodes = safeJsonParse(user.mfa_backup_codes, []);
        const codeIndex = backupCodes.indexOf(mfaCode.toUpperCase());
        
        if (codeIndex === -1) {
          return res.status(400).json({ error: 'Invalid MFA code' });
        }
        
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await req.db.execute(
          'UPDATE users SET mfa_backup_codes = ? WHERE id = ?',
          [JSON.stringify(backupCodes), user.id]
        );
      }
    }
    
    // Create session
    req.session.userId = user.id;
    req.session.data = {
      loginTime: new Date().toISOString(),
      userAgent: req.headers['user-agent']
    };
    await req.session.save();
    
    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        mfaEnabled: user.mfa_enabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;