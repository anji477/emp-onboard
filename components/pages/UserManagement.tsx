import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../App';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';
import Modal from '../common/Modal';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'Employee' | 'Admin' | 'HR';
  team?: string;
  job_title?: string;
  start_date?: string;
  onboarding_progress: number;
}

const UserManagement: React.FC = () => {
  const auth = useContext(UserContext);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState('');
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Employee' as 'Employee' | 'Admin' | 'HR',
    team: '',
    job_title: '',
    start_date: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const usersData = await response.json();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddUser = async () => {
    console.log('handleAddUser called with:', formData);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const newUser = await response.json();
        console.log('New user created:', newUser);
        setUsers([...users, newUser]);
        setNotification(`User "${newUser.name}" added successfully!`);
        setShowAddModal(false);
        resetForm();
        setTimeout(() => setNotification(''), 3000);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setNotification('Error adding user: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setNotification('Error adding user. Please try again.');
    }
  };
  
  const handleInviteUser = async () => {
    try {
      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setUsers([...users, result.user]);
        setNotification(result.message);
        setShowInviteModal(false);
        resetForm();
        setTimeout(() => setNotification(''), 5000);
      } else {
        const errorData = await response.json();
        setNotification('Error inviting user: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      setNotification('Error inviting user. Please try again.');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
        setNotification(`User "${updatedUser.name}" updated successfully!`);
        setEditingUser(null);
        resetForm();
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    try {
      const response = await fetch(`/api/users/${deleteUser.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setUsers(users.filter(u => u.id !== deleteUser.id));
        setNotification(`User "${deleteUser.name}" deleted successfully!`);
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
    setDeleteUser(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Employee',
      team: '',
      job_title: '',
      start_date: ''
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      team: user.team || '',
      job_title: user.job_title || '',
      start_date: user.start_date || ''
    });
  };

  if (!auth?.user || (auth.user.role !== 'Admin' && auth.user.role !== 'HR')) {
    return <div>Access denied. Admin or HR privileges required.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage employees and administrators.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Icon name="envelope" className="w-4 h-4 mr-2" />
            Invite User
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="plus" className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md">
          {notification}
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Progress</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`} alt="" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 
                      user.role === 'HR' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.team || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.onboarding_progress}%</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Icon name="pencil" className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Icon name="trash" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite User Modal */}
      {showInviteModal && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setShowInviteModal(false);
            resetForm();
          }} 
          title="Invite New User"
        >
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <div className="flex">
                <Icon name="information-circle" className="h-5 w-5 text-blue-400 mr-2" />
                <div className="text-sm text-blue-700">
                  An invitation email will be sent to the user with a link to set up their password.
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as 'Employee' | 'Admin' | 'HR'})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Team</label>
              <input
                type="text"
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button 
                onClick={() => {
                  setShowInviteModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleInviteUser}
                disabled={!formData.name || !formData.email}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Add/Edit User Modal */}
      {(showAddModal || editingUser) && (
        <Modal 
          isOpen={true} 
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
            resetForm();
          }} 
          title={editingUser ? 'Edit User' : 'Add New User'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                  placeholder="Enter password for new user"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as 'Employee' | 'Admin' | 'HR'})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              >
                <option value="Employee">Employee</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Team</label>
              <input
                type="text"
                value={formData.team}
                onChange={(e) => setFormData({...formData, team: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  console.log('Modal button clicked', editingUser ? 'Update' : 'Add');
                  if (editingUser) {
                    handleUpdateUser();
                  } else {
                    handleAddUser();
                  }
                }}
                disabled={!formData.name || !formData.email || (!editingUser && !formData.password)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingUser ? 'Update' : 'Add'} User
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <Modal 
          isOpen={true} 
          onClose={() => setDeleteUser(null)} 
          title="Delete User"
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Icon name="exclamation-triangle" className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete <strong>{deleteUser.name}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button 
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete User
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;