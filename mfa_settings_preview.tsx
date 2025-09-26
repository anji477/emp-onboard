// MFA Settings UI Preview (to be added to Settings.tsx)

{/* MFA Policy Settings - Add to Security tab */}
<div className="mt-6">
  <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Multi-Factor Authentication</h3>
  
  <div className="space-y-4">
    {/* MFA Enforcement */}
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white">Enforce MFA</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">Require all users to set up multi-factor authentication</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={settings.mfa_policy.enforced}
          onChange={(e) => updateMfaPolicy('enforced', e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
      </label>
    </div>

    {/* MFA Methods */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Authenticator Apps</h4>
            <p className="text-sm text-gray-500">Google, Microsoft, Authy</p>
          </div>
          <input
            type="checkbox"
            checked={settings.mfa_policy.allow_authenticator}
            onChange={(e) => updateMfaPolicy('allow_authenticator', e.target.checked)}
            className="ml-auto rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Email OTP</h4>
            <p className="text-sm text-gray-500">Backup verification method</p>
          </div>
          <input
            type="checkbox"
            checked={settings.mfa_policy.allow_email_otp}
            onChange={(e) => updateMfaPolicy('allow_email_otp', e.target.checked)}
            className="ml-auto rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

    {/* Role-based MFA */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Require MFA for Roles</label>
      <div className="space-y-2">
        {['Admin', 'HR', 'Manager', 'Employee'].map(role => (
          <label key={role} className="flex items-center">
            <input
              type="checkbox"
              checked={settings.mfa_policy.require_for_roles.includes(role)}
              onChange={(e) => {
                const roles = settings.mfa_policy.require_for_roles;
                if (e.target.checked) {
                  updateMfaPolicy('require_for_roles', [...roles, role]);
                } else {
                  updateMfaPolicy('require_for_roles', roles.filter(r => r !== role));
                }
              }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">{role}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Grace Period */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Setup Grace Period (days)</label>
        <input
          type="number"
          min="0"
          max="30"
          value={settings.mfa_policy.grace_period_days}
          onChange={(e) => updateMfaPolicy('grace_period_days', parseInt(e.target.value))}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
        <p className="text-xs text-gray-500 mt-1">Days users have to set up MFA after enforcement</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Remember Device (days)</label>
        <input
          type="number"
          min="0"
          max="90"
          value={settings.mfa_policy.remember_device_days}
          onChange={(e) => updateMfaPolicy('remember_device_days', parseInt(e.target.value))}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
        <p className="text-xs text-gray-500 mt-1">How long to remember trusted devices</p>
      </div>
    </div>
  </div>
</div>