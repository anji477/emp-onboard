import React, { useContext } from 'react';
import { UserContext } from '../App';
import { UserRole } from '../types';

const RoleSwitcher: React.FC = () => {
  const auth = useContext(UserContext);

  // Always show for testing purposes
  if (!auth?.user) {
    return null;
  }

  const switchRole = async (newRole: UserRole) => {
    try {
      const response = await fetch(`/api/users/${auth.user.id}/switch-role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        // Update user context immediately
        if (auth.updateUser) {
          auth.updateUser({ role: newRole });
        }
        // Force page refresh to reload all data
        setTimeout(() => window.location.reload(), 100);
      }
    } catch (error) {
      console.error('Error switching role:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-4 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 bg-orange-400 rounded-full animate-pulse"></div>
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Role Testing</div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => switchRole(UserRole.Admin)}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
            auth.user.role === UserRole.Admin 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 scale-105' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:shadow-md'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${
            auth.user.role === UserRole.Admin ? 'bg-white' : 'bg-red-400'
          }`}></div>
          Admin
        </button>
        <button
          onClick={() => switchRole(UserRole.Employee)}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
            auth.user.role === UserRole.Employee 
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 scale-105' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:shadow-md'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${
            auth.user.role === UserRole.Employee ? 'bg-white' : 'bg-green-400'
          }`}></div>
          Employee
        </button>
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
        Current: <span className={`font-medium ${
          auth.user.role === UserRole.Admin ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}>{auth.user.role}</span>
      </div>
    </div>
  );
};

export default RoleSwitcher;