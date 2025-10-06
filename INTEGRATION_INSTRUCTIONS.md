# MFA System Integration Instructions

## 1. Replace Existing Files

Replace these existing files with the complete versions:

- `routes/auth.js` → `routes/auth-complete.js`
- `routes/mfa.js` → `routes/mfa-complete.js`
- `components/MfaSetup.tsx` → `components/MfaSetupComplete.tsx`

## 2. Add New Components

Add these new React components:
- `components/MfaLoginComplete.tsx`
- `components/AdminMfaManagement.tsx`

## 3. Update server.js

Add these route imports:
```javascript
import authRoutes from './routes/auth-complete.js';
import mfaRoutes from './routes/mfa-complete.js';
```

## 4. Database Schema Updates

Ensure these tables exist:

```sql
-- MFA sessions table
CREATE TABLE IF NOT EXISTS mfa_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  secret VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions table (handled by SessionStore)
-- Will be created automatically by sessionStore.js
```

## 5. Frontend Route Updates

Add these routes to your React router:

```jsx
// MFA Login route
<Route path="/mfa-login" component={MfaLoginComplete} />

// Admin MFA Management (Admin only)
<Route path="/admin/mfa" component={AdminMfaManagement} />
```

## 6. Environment Variables

Ensure these are set:
```
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

## 7. Dependencies

Install required packages:
```bash
npm install speakeasy qrcode bcrypt express-session
```

## 8. Testing Flow

1. **Login**: User logs in → redirected to MFA setup if not configured
2. **MFA Setup**: Scan QR code → verify TOTP → get backup codes
3. **Subsequent Logins**: Enter TOTP or backup code
4. **Admin Management**: Admins can force MFA re-registration

## 9. Security Features Included

- ✅ Session-based authentication
- ✅ CSRF protection
- ✅ Token blacklisting on logout
- ✅ MFA session expiry (30 minutes)
- ✅ Backup codes for recovery
- ✅ Admin force re-registration
- ✅ Role-based access control

All components are ready for production use.