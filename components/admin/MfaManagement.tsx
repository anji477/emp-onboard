import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Loader from '../common/Loader';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  mfa_enabled: boolean;
  mfa_setup_completed: boolean;
}

const MfaManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetUserMfa = async (userId: number, userName: string) => {
    if (!confirm(`Reset MFA for ${userName}? They will need to set up MFA again on next login.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/reset-mfa`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        setSuccess(`MFA reset for ${userName}. They must re-register on next login.`);
        fetchUsers();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const error = await response.json();
        setError(error.message || 'Failed to reset MFA');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MFA Management</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <Icon name="exclamation-triangle" className="h-5 w-5 text-red-400 mr-2" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <Icon name="check-circle" className="h-5 w-5 text-green-400 mr-2" />
            <div className="text-sm text-green-700">{success}</div>
          </div>
        </div>
      )}

      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">User MFA Status</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MFA Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.mfa_enabled && user.mfa_setup_completed ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Not Set Up
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.mfa_enabled && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => resetUserMfa(user.id, user.name)}
                          disabled={loading}
                        >
                          Reset MFA
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MfaManagement;