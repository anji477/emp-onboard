import React, { useState, useEffect } from 'react';
import Button from './common/Button';
import Icon from './common/Icon';
import Loader from './common/Loader';

interface User {
  id: number;
  name: string;
  email: string;
  mfa_enabled?: boolean;
  mfa_setup_completed?: boolean;
}

interface UserMfaManagementProps {
  users: User[];
  onRefresh: () => void;
}

const UserMfaManagement: React.FC<UserMfaManagementProps> = ({ users, onRefresh }) => {
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const resetUserMfa = async (userId: number, userName: string) => {
    if (!confirm(`Reset MFA for ${userName}? This will disable their MFA and require them to set it up again.`)) {
      return;
    }

    setLoading(prev => ({ ...prev, [userId]: true }));
    setError('');

    try {
      const response = await fetch(`/api/users/${userId}/reset-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess(`MFA reset successfully for ${userName}`);
        setTimeout(() => setSuccess(''), 3000);
        onRefresh();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to reset MFA');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">MFA Management</h3>
        <Button onClick={onRefresh} variant="secondary" size="sm">
          <Icon name="arrow-path" className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <Icon name="exclamation-triangle" className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <Icon name="check-circle" className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                MFA Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.mfa_enabled && user.mfa_setup_completed ? (
                      <>
                        <Icon name="shield-check" className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm text-green-700">Enabled</span>
                      </>
                    ) : (
                      <>
                        <Icon name="shield-exclamation" className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">Disabled</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user.mfa_enabled && user.mfa_setup_completed ? (
                    <Button
                      onClick={() => resetUserMfa(user.id, user.name)}
                      disabled={loading[user.id]}
                      variant="secondary"
                      size="sm"
                    >
                      {loading[user.id] ? (
                        <Loader size="sm" />
                      ) : (
                        <>
                          <Icon name="arrow-path" className="h-4 w-4 mr-1" />
                          Reset MFA
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-gray-400">No action needed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8">
          <Icon name="users" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No users found</p>
        </div>
      )}
    </div>
  );
};

export default UserMfaManagement;