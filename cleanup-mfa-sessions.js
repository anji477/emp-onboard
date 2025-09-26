// cleanup-mfa-sessions.js - Cleanup expired MFA sessions
import db from './db-mysql.js';

async function cleanupExpiredSessions() {
  try {
    console.log('🧹 Cleaning up expired MFA sessions...');

    // Delete expired sessions
    const [result] = await db.execute(
      'DELETE FROM mfa_sessions WHERE expires_at < NOW()'
    );

    console.log(`✅ Cleaned up ${result.affectedRows} expired MFA sessions`);

    // Clean up old audit logs (keep last 30 days)
    const [auditResult] = await db.execute(
      'DELETE FROM mfa_audit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    console.log(`✅ Cleaned up ${auditResult.affectedRows} old audit log entries`);

    // Clean up expired trusted devices
    const [deviceResult] = await db.execute(
      'DELETE FROM trusted_devices WHERE expires_at < NOW()'
    );

    console.log(`✅ Cleaned up ${deviceResult.affectedRows} expired trusted devices`);

    console.log('🎉 MFA cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during MFA cleanup:', error);
  } finally {
    process.exit(0);
  }
}

cleanupExpiredSessions();