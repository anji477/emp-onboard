// components/admin/MfaPolicy.tsx
import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, UserGroupIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MfaPolicy {
  enforced: boolean;
  require_for_roles: string[];
  grace_period_days: number;
}

const MfaPolicy: React.FC = () => {
  const [policy, setPolicy] = useState<MfaPolicy>({
    enforced: false,
    require_for_roles: [],
    grace_period_days: 7
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const availableRoles = ['Admin', 'HR', 'Manager', 'Employee'];

  useEffect(() => {
    fetchPolicy();
    fetchUsers();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await fetch('/api/mfa/policy', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPolicy(data);
      }
    } catch (error) {
      console.error('Error fetching MFA policy:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const savePolicy = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/mfa/policy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(policy)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('MFA policy updated successfully');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.message || 'Failed to update policy');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetUserMfa = async (userId: number, userName: string) => {
    if (!confirm(`Reset MFA for ${userName}? They will need to set up MFA again on next login.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/mfa/reset/${userId}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`MFA reset for ${userName}`);
        setTimeout(() => setMessage(''), 3000);
        fetchUsers(); // Refresh user list
      } else {
        setMessage(data.message || 'Failed to reset MFA');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  const toggleRoleRequirement = (role: string) => {
    setPolicy(prev => ({
      ...prev,
      require_for_roles: prev.require_for_roles.includes(role)
        ? prev.require_for_roles.filter(r => r !== role)
        : [...prev.require_for_roles, role]
    }));
  };

  const affectedUsers = users.filter(user => 
    policy.enforced || policy.require_for_roles.includes(user.role)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">MFA Policy Settings</h3>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <div className="flex items-center">
                <input
                  id="enforced"
                  type="checkbox"
                  checked={policy.enforced}
                  onChange={(e) => setPolicy(prev => ({ ...prev, enforced: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="enforced" className="ml-2 block text-sm font-medium text-gray-700">
                  Enforce MFA for all users
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                When enabled, all users must set up MFA to access the system
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Require MFA for specific roles
              </label>
              <div className="space-y-2">
                {availableRoles.map(role => (
                  <div key={role} className="flex items-center">
                    <input
                      id={`role-${role}`}
                      type="checkbox"
                      checked={policy.require_for_roles.includes(role)}
                      onChange={() => toggleRoleRequirement(role)}
                      disabled={policy.enforced}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label htmlFor={`role-${role}`} className="ml-2 block text-sm text-gray-700">
                      {role}
                    </label>
                  </div>
                ))}
              </div>
              {policy.enforced && (
                <p className="mt-1 text-sm text-gray-500">
                  Role-specific settings are disabled when MFA is enforced for all users
                </p>
              )}
            </div>

            <div>
              <label htmlFor="grace-period" className="block text-sm font-medium text-gray-700">
                Grace period (days)
              </label>
              <input
                id="grace-period"
                type="number"
                min="0"
                max="30"
                value={policy.grace_period_days}
                onChange={(e) => setPolicy(prev => ({ ...prev, grace_period_days: parseInt(e.target.value) || 0 }))}
                className="mt-1 block w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Number of days users have to set up MFA before being locked out
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={savePolicy}
                disabled={saving}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Affected Users */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              Affected Users ({affectedUsers.length})
            </h3>
          </div>

          {affectedUsers.length > 0 ? (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      MFA Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {affectedUsers.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.mfa_enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.mfa_enabled ? 'Enabled' : 'Not Set Up'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.mfa_enabled && (
                          <button
                            onClick={() => resetUserMfa(user.id, user.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reset MFA
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                No users will be affected by the current MFA policy
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MfaPolicy;