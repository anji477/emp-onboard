# MFA Implementation Flow

## Phase 1: Admin Settings
1. Add MFA policy settings in Settings → Security tab
2. Options:
   - Enforce MFA for all users
   - Enforce MFA for specific roles (Admin, HR)
   - Allow authenticator apps (Google, Microsoft, Authy)
   - Allow email OTP as backup
   - Grace period for setup (days)
   - Remember device duration

## Phase 2: User MFA Setup
1. **Forced Setup Flow** (when MFA enforced):
   - Redirect to MFA setup after login
   - Show setup options: Authenticator App (preferred) or Email OTP
   
2. **Authenticator App Setup**:
   - Generate TOTP secret
   - Display QR code with app name and user email
   - User scans with Google/Microsoft Authenticator
   - Verify setup with test code
   - Generate 10 backup codes
   
3. **Email OTP Setup**:
   - Send test OTP to user email
   - Verify email OTP works
   - Generate backup codes

## Phase 3: Login Enhancement
1. **Standard Login** → **MFA Verification**
2. **MFA Verification Screen**:
   - Primary: Enter authenticator code (6 digits)
   - Secondary: "Use email OTP instead" button
   - Tertiary: "Use backup code" link
   - Optional: "Remember this device for 30 days"

## Phase 4: User Management
1. **Profile Settings**:
   - View MFA status
   - Regenerate backup codes
   - Disable MFA (if not enforced)
   - View trusted devices

2. **Admin Management**:
   - View users' MFA status
   - Force MFA reset for users
   - View MFA audit logs

## Security Features
- Rate limiting on MFA attempts
- Audit logging for all MFA actions
- Backup codes (single use, 10 codes)
- Trusted device management
- Grace period for MFA setup
- Emergency admin bypass (with audit)

## API Endpoints Needed
- POST /api/mfa/setup-authenticator
- POST /api/mfa/verify-setup
- POST /api/mfa/send-email-otp
- POST /api/mfa/verify-login
- GET /api/mfa/backup-codes
- POST /api/mfa/regenerate-backup-codes
- GET /api/mfa/trusted-devices
- DELETE /api/mfa/trusted-devices/:id