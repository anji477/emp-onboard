# MFA Integration Instructions

## 1. Database Setup

Run the SQL schema:
```bash
mysql -u root -p onboarding_db < mfa-schema.sql
```

## 2. Backend Integration

Add to your main server.js:
```javascript
import mfaRoutes from './mfa-routes.js';

// Add MFA routes
app.use('/api', mfaRoutes);

// Cleanup expired sessions (run every hour)
setInterval(async () => {
  try {
    await db.execute('DELETE FROM mfa_sessions WHERE expires_at < NOW()');
    console.log('Cleaned up expired MFA sessions');
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}, 60 * 60 * 1000);
```

## 3. Frontend Integration

Import and use the component:
```javascript
import MfaSetup from './components/MfaSetup';

// In your routing
<Route path="/mfa-setup" element={<MfaSetup />} />
```

## 4. Login Flow Integration

Update your login endpoint to check MFA:
```javascript
app.post('/api/login', async (req, res) => {
  // ... existing login logic ...
  
  // After password verification
  if (user.mfa_enabled && user.mfa_setup_completed) {
    // Redirect to MFA verification
    return res.json({ requiresMfa: true, userId: user.id });
  }
  
  // Check if MFA is required for user role
  const mfaRequired = ['Admin', 'HR'].includes(user.role);
  if (mfaRequired && !user.mfa_setup_completed) {
    // Redirect to MFA setup
    return res.json({ requiresMfaSetup: true });
  }
  
  // Normal login
  res.json({ user: userData });
});
```

## 5. Admin MFA Management

Add admin routes:
```javascript
// Get all users with MFA status
app.get('/api/admin/users-mfa', verifyToken, requireRole(['Admin']), async (req, res) => {
  const [users] = await db.execute(
    'SELECT id, name, email, role, mfa_enabled, mfa_setup_completed FROM users'
  );
  res.json(users);
});

// Enforce MFA for specific roles
app.post('/api/admin/enforce-mfa', verifyToken, requireRole(['Admin']), async (req, res) => {
  const { roles } = req.body;
  // Store MFA policy in database or config
  res.json({ success: true });
});
```

## 6. Security Features

- **Session Tokens**: 30-minute expiry, single-use
- **Secret Storage**: Base32 encoded in database
- **Backup Codes**: 10 codes, single-use each
- **Audit Logging**: Track setup/reset events
- **Cleanup**: Automatic expired session removal

## 7. Error Handling

The implementation handles:
- Expired sessions with restart flow
- Invalid tokens with proper error messages
- Network errors with retry options
- QR code failures with manual entry fallback

## 8. Testing

Test scenarios:
1. Normal MFA setup flow
2. Session expiration during setup
3. Manual entry when QR fails
4. Admin MFA reset
5. Backup code usage