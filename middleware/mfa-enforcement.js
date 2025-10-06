// MFA enforcement middleware
export const requireMfaSetup = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.id;
    
    // Check user's MFA status
    const [users] = await req.db.execute(
      'SELECT mfa_enabled, mfa_setup_completed FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // If MFA is not enabled or setup not completed, block access
    if (!user.mfa_enabled || !user.mfa_setup_completed) {
      return res.status(403).json({
        message: 'MFA setup required',
        requireMfaSetup: true,
        redirectTo: '/mfa-setup'
      });
    }
    
    next();
  } catch (error) {
    console.error('MFA enforcement error:', error);
    res.status(500).json({ message: 'MFA check failed' });
  }
};

export default requireMfaSetup;