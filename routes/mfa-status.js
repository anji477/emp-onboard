import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get MFA status - check if first time setup
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await req.db.execute(
      'SELECT mfa_enabled, mfa_setup_completed FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    const isFirstTime = !user.mfa_enabled;
    
    res.json({
      mfaEnabled: user.mfa_enabled || false,
      setupCompleted: user.mfa_setup_completed || false,
      isFirstTime
    });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({ message: 'Failed to get MFA status' });
  }
});

export default router;