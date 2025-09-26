import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Loader from '../common/Loader';

interface MfaPolicy {
  enforced: boolean;
  allow_email_otp: boolean;
  allow_authenticator: boolean;
  require_for_roles: string[];
  grace_period_days: number;
  remember_device_days: number;
}

const MfaSettings: React.FC = () => {
  const [policy, setPolicy] = useState<MfaPolicy>({
    enforced: false,
    allow_email_otp: true,
    allow_authenticator: true,
    require_for_roles: ['Admin'],
    grace_period_days: 7,
    remember_device_days: 30
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMfaSettings();
  }, []);

  const fetchMfaSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const mfaPolicy = data.mfa_policy?.value;
        if (mfaPolicy) {
          setPolicy(mfaPolicy);
        }
      }
    } catch (error) {
      console.error('Error fetching MFA settings:', error);
      setError('Failed to load MFA settings');
    } finally {
      setLoading(false);
    }
  };

  const saveMfaSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mfa_policy: {
            value: policy,
            category: 'security'
          }
        })
      });

      if (response.ok) {
        setSuccess('MFA settings saved successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to save settings');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    setPolicy(prev => ({
      ...prev,
      require_for_roles: prev.require_for_roles.includes(role)
        ? prev.require_for_roles.filter(r => r !== role)
        : [...prev.require_for_roles, role]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Multi-Factor Authentication
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure MFA requirements and policies for your organization
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <Icon name="exclamation-triangle" className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <Icon name="check-circle" className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">MFA Enforcement</h2>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={policy.enforced}
                  onChange={(e) => setPolicy(prev => ({ ...prev, enforced: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enforce MFA for all users
                </span>
              </label>
              
              <div className="ml-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  When enabled, all users will be required to set up MFA within the grace period.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-3">Role-based Requirements</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Require MFA for specific roles (applies even when global enforcement is disabled)
            </p>
            
            <div className="space-y-2">
              {['Admin', 'HR', 'Employee'].map(role => (
                <label key={role} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={policy.require_for_roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {role}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-3">Allowed Methods</h3>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={policy.allow_authenticator}
                  onChange={(e) => setPolicy(prev => ({ ...prev, allow_authenticator: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Authenticator Apps (Google Authenticator, Authy, etc.)
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={policy.allow_email_otp}
                  onChange={(e) => setPolicy(prev => ({ ...prev, allow_email_otp: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Email OTP
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grace Period (days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={policy.grace_period_days}
                onChange={(e) => setPolicy(prev => ({ ...prev, grace_period_days: parseInt(e.target.value) || 7 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Days users have to set up MFA after enforcement
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remember Device (days)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={policy.remember_device_days}
                onChange={(e) => setPolicy(prev => ({ ...prev, remember_device_days: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How long to remember trusted devices
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={saveMfaSettings}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <div className="flex items-center">
                  <Loader size="sm" color="white" />
                  <span className="ml-2">Saving...</span>
                </div>
              ) : (
                'Save MFA Settings'
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div>
          <h2 className="text-lg font-semibold mb-4">MFA Status Overview</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <Icon name="information-circle" className="h-5 w-5 text-blue-400 mr-2" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Current Status:</p>
                <ul className="space-y-1">
                  <li>• MFA Enforcement: {policy.enforced ? 'Enabled' : 'Disabled'}</li>
                  <li>• Required Roles: {policy.require_for_roles.length > 0 ? policy.require_for_roles.join(', ') : 'None'}</li>
                  <li>• Available Methods: {[
                    policy.allow_authenticator && 'Authenticator',
                    policy.allow_email_otp && 'Email OTP'
                  ].filter(Boolean).join(', ')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MfaSettings;