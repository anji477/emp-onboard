# Multi-Factor Authentication (MFA) Implementation

## Overview

This implementation provides a complete MFA system with authenticator app support, QR code generation, and secure backup codes. The system is designed with security best practices and provides a smooth user experience.

## Features

### 🔐 Security Features
- **Server-side QR Code Generation**: QR codes are generated on the server using the `qrcode` library
- **CSRF Protection**: All MFA endpoints are protected with CSRF tokens
- **Session-based Setup**: Temporary sessions with expiration for secure setup flow
- **Backup Codes**: 10 single-use backup codes generated during setup
- **Time-based Validation**: TOTP codes with configurable time window
- **Secure Secret Storage**: MFA secrets are stored encrypted in the database

### 🎯 User Experience
- **Progressive Setup Wizard**: Step-by-step setup process with clear instructions
- **Dual Entry Methods**: QR code scanning + manual entry options
- **Real-time Validation**: Immediate feedback on code entry
- **Error Handling**: Comprehensive error messages and recovery options
- **Mobile-friendly**: Responsive design optimized for mobile devices
- **Accessibility**: ARIA labels and keyboard navigation support

## Architecture

### Backend Components

#### 1. MFA Routes (`/routes/mfa.js`)
- `/api/mfa/start-setup` - Initialize MFA setup session
- `/api/mfa/validate-session` - Validate setup session token
- `/api/mfa/restart-setup` - Generate new QR code for expired sessions
- `/api/mfa/setup-authenticator` - Setup authenticator for optional MFA
- `/api/mfa/complete-setup` - Complete MFA setup with method selection
- `/api/mfa/verify-setup` - Verify setup code and enable MFA
- `/api/mfa/verify-login` - Verify MFA code during login
- `/api/mfa/policy` - Get/update MFA policy (Admin only)
- `/api/mfa/reset/:userId` - Reset user MFA (Admin only)

#### 2. Database Schema
```sql
-- MFA Sessions Table
CREATE TABLE mfa_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  secret VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_expires_at (expires_at)
);

-- User MFA Fields (added to users table)
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN mfa_backup_codes JSON;
ALTER TABLE users ADD COLUMN mfa_setup_completed BOOLEAN DEFAULT FALSE;
```

### Frontend Components

#### 1. MFA Setup (`/components/pages/MfaSetup.tsx`)
- Complete setup wizard with progress tracking
- QR code display with fallback options
- Manual entry key display with copy functionality
- Code verification with real-time validation
- Backup codes display and download
- Session expiration handling

#### 2. MFA Verification (`/components/pages/MfaVerification.tsx`)
- Login verification interface
- Support for TOTP codes and backup codes
- Attempt limiting and lockout protection
- Clear error messages and guidance

#### 3. MFA Demo (`/components/pages/MfaDemo.tsx`)
- Interactive demo of the complete MFA flow
- Testing interface for setup and verification
- Feature showcase and documentation

## Configuration

### Environment Variables (.env)
```bash
# MFA Configuration
MFA_ISSUER=MyDigitalAccounts
MFA_SERVICE_NAME=Employee Onboarding Portal
MFA_SETUP_SESSION_MINUTES=30
MFA_VERIFY_SESSION_MINUTES=10
MFA_CLEANUP_INTERVAL_HOURS=1
MFA_AUDIT_RETENTION_DAYS=30
```

### MFA Policy Settings
```json
{
  "enforced": false,
  "require_for_roles": ["Admin", "HR"],
  "grace_period_days": 7,
  "backup_codes_count": 10,
  "session_timeout_minutes": 30
}
```

## Usage

### 1. Testing the Implementation

Visit the demo page to test the complete MFA flow:
```
http://localhost:5173/#/mfa-demo
```

### 2. Setup Flow
1. User logs in with username/password
2. If MFA is required, redirect to setup page
3. User scans QR code or enters manual key
4. User verifies with 6-digit code
5. System generates backup codes
6. MFA is enabled for the user

### 3. Login Flow
1. User enters username/password
2. If MFA is enabled, prompt for verification
3. User enters TOTP code or backup code
4. System validates and grants access

## Security Considerations

### 1. Session Management
- Setup sessions expire after 30 minutes
- Session tokens are cryptographically secure
- Expired sessions are automatically cleaned up

### 2. Code Validation
- TOTP codes have a 2-window tolerance (±60 seconds)
- Backup codes are single-use and removed after use
- Failed attempts are limited and logged

### 3. Data Protection
- MFA secrets are stored securely in the database
- QR codes are generated server-side to prevent exposure
- CSRF tokens protect all state-changing operations

## Supported Authenticator Apps

- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (iOS/Android/Desktop)
- **LastPass Authenticator** (iOS/Android)
- Any TOTP-compatible authenticator app

## API Examples

### Start MFA Setup
```javascript
const response = await fetch('/api/mfa/start-setup', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({ userEmail: 'user@example.com' })
});

const data = await response.json();
// Returns: sessionToken, qrCode (data URL), secret, accountName, etc.
```

### Verify Setup Code
```javascript
const response = await fetch('/api/mfa/verify-setup', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  credentials: 'include',
  body: JSON.stringify({ 
    sessionToken: 'session_token_here',
    token: '123456'
  })
});

const data = await response.json();
// Returns: success, backupCodes, message
```

## Troubleshooting

### Common Issues

1. **QR Code Not Displaying**
   - Check that the QRCode library is properly installed
   - Verify server-side QR code generation is working
   - Check browser console for errors

2. **Session Expired Errors**
   - Sessions expire after 30 minutes for security
   - Use the "Generate New QR Code" button to restart
   - Check system time synchronization

3. **Invalid Code Errors**
   - Ensure device time is synchronized
   - Check that the correct secret was entered
   - Verify the authenticator app is using the right account

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will provide detailed logs for MFA operations and session management.

## Future Enhancements

- [ ] SMS-based MFA option
- [ ] Hardware token support (FIDO2/WebAuthn)
- [ ] MFA recovery via email
- [ ] Admin dashboard for MFA management
- [ ] Audit logging for MFA events
- [ ] Integration with external identity providers

## Dependencies

```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.4",
  "qrcode.react": "^4.2.0",
  "crypto": "^1.0.1"
}
```

## License

This MFA implementation is part of the Employee Onboarding Portal and follows the same licensing terms.