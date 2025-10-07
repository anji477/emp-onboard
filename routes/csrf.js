import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /csrf-token - Generate CSRF token for authenticated user
router.get('/csrf-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    // Generate CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');
    
    // Store CSRF token in session store
    const { sessionStore } = req.app.locals;
    await sessionStore.create(userId, {
      type: 'csrf',
      token: csrfToken
    }, 60 * 60 * 1000); // 1 hour expiry

    res.json({
      success: true,
      csrfToken
    });

  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token'
    });
  }
});

export default router;