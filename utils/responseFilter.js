// Response filtering to prevent sensitive data exposure
export const filterUserResponse = (user) => {
  if (!user) return null;
  
  const {
    password_hash,
    mfa_secret,
    mfa_backup_codes,
    invitation_token,
    invitation_expires,
    reset_token,
    reset_expires,
    ...safeUser
  } = user;
  
  return safeUser;
};

export const filterUsersResponse = (users) => {
  return users.map(filterUserResponse);
};

export const filterSettingsResponse = (settings) => {
  const filtered = { ...settings };
  
  // Remove sensitive settings
  if (filtered.email_settings?.value) {
    const emailSettings = { ...filtered.email_settings.value };
    if (emailSettings.smtp_password) {
      emailSettings.smtp_password = process.env.REDACTION_MASK || '***';
    }
    filtered.email_settings = { ...filtered.email_settings, value: emailSettings };
  }
  
  return filtered;
};

export const removeDebugInfo = (error) => {
  if (process.env.NODE_ENV === 'production') {
    const { stack, ...safeError } = error;
    return safeError;
  }
  return error;
};