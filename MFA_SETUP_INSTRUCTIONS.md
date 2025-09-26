# Multi-Factor Authentication (MFA) Setup Instructions

## Overview
Your Employee Onboarding Portal now has complete MFA support with:
- **Authenticator Apps** (Google Authenticator, Authy, Microsoft Authenticator)
- **Email OTP** (One-Time Password via email)
- **Backup Codes** (Emergency access codes)
- **Admin-controlled enforcement** (Enable/disable MFA for specific roles or all users)
- **Trusted devices** (Remember devices for 30 days)

## 🚀 Quick Setup (5 minutes)

### Step 1: Apply Database Changes
```bash
node apply-mfa-schema.js
```
This creates the necessary MFA tables and columns.

### Step 2: Configure Email (Optional but Recommended)
Update your `.env` file with email settings for OTP delivery:
```env
# Email Configuration for MFA OTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# MFA Configuration
MFA_ISSUER=MyDigitalAccounts
MFA_SERVICE_NAME=Employee Onboarding Portal
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### Step 3: Restart Server
```bash
npm run server
```

### Step 4: Configure MFA Policy (Admin Only)
1. Login as Admin
2. Go to **Settings** → **Security** → **MFA Settings**
3. Configure your MFA policy:
   - **Enforce MFA for all users**: Enable/disable global MFA requirement
   - **Role-based requirements**: Require MFA for specific roles (Admin, HR, Employee)
   - **Allowed methods**: Enable Authenticator apps and/or Email OTP
   - **Grace period**: Days users have to set up MFA after enforcement
   - **Remember device**: How long to remember trusted devices

## 🔧 MFA Flow

### For Users (When MFA is Required):
1. **Login** with email/password
2. **MFA Setup** (first time):
   - Scan QR code with authenticator app
   - Verify with 6-digit code
   - Save backup codes securely
3. **MFA Verification** (subsequent logins):
   - Enter code from authenticator app, OR
   - Request email OTP, OR
   - Use backup code
   - Option to remember device for 30 days

### For Admins:
1. **Configure Policy**: Set MFA requirements in Settings
2. **Monitor Compliance**: View MFA status in user management
3. **Support Users**: Help with MFA setup and issues

## 📱 Supported Authenticator Apps
- **Google Authenticator** (iOS/Android)
- **Microsoft Authenticator** (iOS/Android)
- **Authy** (iOS/Android/Desktop)
- **1Password** (with TOTP support)
- **Bitwarden** (with TOTP support)

## 🔒 Security Features

### Backup Codes
- 10 unique 8-character codes generated during setup
- Each code can only be used once
- Users can regenerate codes anytime
- Codes are hashed in database

### Trusted Devices
- Users can mark devices as trusted for 30 days
- Based on device fingerprint (IP + User Agent)
- Admins can configure trust duration
- Automatic cleanup of expired devices

### Audit Logging
- All MFA events are logged (setup, success, failure, disable)
- Includes IP address and user agent
- Helps with security monitoring and compliance

## ⚙️ Configuration Options

### MFA Policy Settings
```json
{
  "enforced": false,                    // Global MFA requirement
  "allow_email_otp": true,             // Enable email OTP method
  "allow_authenticator": true,         // Enable authenticator apps
  "require_for_roles": ["Admin"],      // Roles that must use MFA
  "grace_period_days": 7,              // Days to set up MFA after enforcement
  "remember_device_days": 30           // Trusted device duration
}
```

### Environment Variables
```env
# Required for MFA
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MFA_ISSUER=MyDigitalAccounts
MFA_SERVICE_NAME=Employee Onboarding Portal

# Required for Email OTP
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"Database table not found"**
   - Run: `node apply-mfa-schema.js`

2. **"Email OTP not working"**
   - Check `.env` email configuration
   - Test email settings in Admin → Settings → Email Test

3. **"QR code not showing"**
   - Ensure `qrcode` and `speakeasy` packages are installed
   - Check browser console for errors

4. **"Invalid verification code"**
   - Check device time synchronization
   - Try backup codes if available
   - Contact admin for MFA reset

### Admin Actions:

1. **Reset User MFA**:
   ```sql
   UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_backup_codes = NULL WHERE email = 'user@example.com';
   ```

2. **View MFA Status**:
   ```sql
   SELECT email, mfa_enabled, mfa_setup_completed FROM users;
   ```

3. **Check MFA Logs**:
   ```sql
   SELECT * FROM mfa_audit_log ORDER BY created_at DESC LIMIT 50;
   ```

## 🔐 Security Best Practices

1. **Use Strong JWT Secret**: Change `JWT_SECRET` in production
2. **Enable HTTPS**: MFA requires secure connections in production
3. **Regular Backup Code Rotation**: Encourage users to regenerate codes periodically
4. **Monitor Failed Attempts**: Check MFA audit logs for suspicious activity
5. **Email Security**: Use app passwords for Gmail, secure SMTP for other providers

## 📊 MFA Status Dashboard

Admins can view MFA compliance in the user management section:
- Users with MFA enabled
- Users pending MFA setup
- Recent MFA activity
- Failed verification attempts

## 🆘 Support

For technical support:
1. Check server logs for detailed error messages
2. Verify database schema with `apply-mfa-schema.js`
3. Test email configuration in Admin Settings
4. Review MFA audit logs for user-specific issues

---

**🎉 Your MFA implementation is now complete and ready for production use!**

The system provides enterprise-grade security with user-friendly setup and admin control. Users can choose their preferred MFA method while admins maintain full policy control.