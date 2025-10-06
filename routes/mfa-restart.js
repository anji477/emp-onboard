import express from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Restart MFA setup - generate new session and QR code
router.post('/restart-setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionStore } = req.app.locals;

    // Generate new MFA secret
    const secret = speakeasy.generateSecret({
      name: `EmpOnboard (${req.user.email})`,
      issuer: 'EmpOnboard'
    });

    // Create new MFA session (30 minutes)
    const sessionId = await sessionStore.create(userId, {
      type: 'mfa_setup',
      secret: secret.base32,
      userId
    }, 30 * 60 * 1000);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      sessionId,
      qrCode: qrCodeUrl,
      secret: secret.base32,
      expiresIn: 30 * 60 // 30 minutes in seconds
    });

  } catch (error) {
    console.error('MFA restart setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart MFA setup'
    });
  }
});

export default router;