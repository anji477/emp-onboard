# Security Guidelines

## Password Security Fixes Applied

### Fixed Vulnerabilities
1. **Hardcoded Database Passwords**: Removed hardcoded credentials from all utility scripts
2. **Default Admin Passwords**: Replaced hardcoded "admin123" with secure random generation
3. **Weak Default Passwords**: Eliminated "password123" defaults across all files
4. **JWT Secret Fallback**: Removed hardcoded JWT secret fallback

### Secure Password Management

#### For Development
1. Copy `.env.example` to `.env`
2. Replace all placeholder values with secure credentials
3. Never commit `.env` file to version control

#### For Production
1. Use environment variables or secure secret management
2. Generate strong passwords using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Rotate credentials regularly

#### Password Requirements
- Minimum 12 characters for admin accounts
- Mix of uppercase, lowercase, numbers, and symbols
- No dictionary words or common patterns
- Unique passwords for each service

### Database Security
- Use dedicated database user with minimal privileges
- Enable SSL/TLS for database connections
- Regular security updates and patches

### Application Security
- JWT secrets must be cryptographically secure
- Password hashing uses bcrypt with salt rounds ≥ 12
- MFA enforced for admin accounts
- Session management with secure cookies

## Emergency Procedures

### If Credentials Are Compromised
1. Immediately rotate all affected passwords
2. Revoke and regenerate JWT secrets
3. Force logout all active sessions
4. Review access logs for suspicious activity
5. Update all environment configurations

### Password Reset Process
1. Use `reset-admin-password.js` for emergency admin access
2. New passwords are randomly generated and displayed once
3. Force password change on first login
4. Document all emergency access in security logs