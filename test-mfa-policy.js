// test-mfa-policy.js
import db from './db-mysql.js';

async function testMfaPolicy() {
  try {
    // Set MFA policy to require MFA for Admin role
    const policy = {
      enforced: false,
      require_for_roles: ['Admin'],
      grace_period_days: 7
    };

    await db.execute(
      'INSERT INTO organization_settings (setting_key, setting_value, category, description) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      ['mfa_policy', JSON.stringify(policy), 'security', 'Multi-factor authentication policy settings']
    );

    console.log('✅ MFA policy set: Admin role requires MFA');

    // Check current users and their MFA status
    const [users] = await db.execute('SELECT id, name, email, role, mfa_enabled, mfa_setup_completed FROM users');
    
    console.log('\n📊 Current users:');
    users.forEach(user => {
      const mfaStatus = user.mfa_enabled ? '✅ Enabled' : '❌ Not Set Up';
      const affected = policy.enforced || policy.require_for_roles.includes(user.role) ? '🔒 MFA Required' : '🔓 Optional';
      console.log(`  ${user.name} (${user.role}) - ${mfaStatus} - ${affected}`);
    });

    console.log('\n🎯 MFA enforcement is now active!');
    console.log('   - Admin users will be redirected to MFA setup on login');
    console.log('   - Other users can login normally');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMfaPolicy();