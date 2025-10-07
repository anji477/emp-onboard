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
  role: string;
  team: string;
}

interface AssignableItem {
  id: number;
  title: string;
  category: string;
  type: 'task' | 'policy' | 'training' | 'document';
}

const AssignmentManager: React.FC = () => {
  const auth = useContext(UserContext);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    tasks: AssignableItem[];
    policies: AssignableItem[];
    training: AssignableItem[];
  }>({ tasks: [], policies: [], training: [] });
  const [selectedItems, setSelectedItems] = useState<AssignableItem[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: '',
    description: '',
    dueDate: '',
    assignedUsers: [] as number[]
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchAvailableItems();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const [tasksRes, policiesRes, trainingRes] = await Promise.all([
        fetch('/api/tasks', { credentials: 'include' }),
        fetch('/api/policies', { credentials: 'include' }),
        fetch('/api/training', { credentials: 'include' })
      ]);

      const tasks = await tasksRes.json();
      const policies = await policiesRes.json();
      const training = await trainingRes.json();

      setAvailableItems({
        tasks: tasks.map((t: any) => ({ ...t, type: 'task' })),
        policies: policies.map((p: any) => ({ ...p, type: 'policy' })),
        training: training.map((tr: any) => ({ ...tr, type: 'training' }))
      });
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchExistingAssignments = async (userId: number) => {
    try {
      const sanitizedUserId = String(userId).replace(/[\r\n\t]/g, ' ').substring(0, 20);
      console.log('Fetching assignments for user:', sanitizedUserId);
      const existing: string[] = [];
      
      // Fetch tasks directly assigned to user
      const tasksResponse = await fetch(`/api/users/${userId}/tasks`, { credentials: 'include' });
      if (tasksResponse.ok) {
        const userTasks = await tasksResponse.json();
        userTasks.forEach((task: any) => {
          existing.push(`task-${task.id}`);
        });
      }
      
      // Fetch training assigned to user
      const trainingResponse = await fetch(`/api/training/user/${userId}`, { credentials: 'include' });
      if (trainingResponse.ok) {
        const userTraining = await trainingResponse.json();
        userTraining.forEach((training: any) => {
          existing.push(`training-${training.id}`);
        });
      }
      
      // Check assignments table for all item types
      const assignmentsResponse = await fetch(`/api/assignments/${userId}`, { credentials: 'include' });
      if (assignmentsResponse.ok) {
        const assignments = await assignmentsResponse.json();
        assignments.forEach((a: any) => {
          existing.push(`${a.item_type}-${a.item_id}`);
        });
      }
      
      console.log('All existing assignments:', existing);
      setExistingAssignments(existing);
    } catch (error) {
      console.error('Error fetching existing assignments:', error);
    }
  };

  const handleAssignItems = async () => {
    if (!selectedUser || selectedItems.length === 0) return;

    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: selectedUser.id,
          items: selectedItems,
          dueDate
        })
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedItems([]);
        setDueDate('');
        setSuccessMessage('Items assigned successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error assigning items:', error);
    }
  };

  const toggleItemSelection = (item: AssignableItem) => {
    setSelectedItems(prev => 
      prev.find(i => i.id === item.id && i.type === item.type)
        ? prev.filter(i => !(i.id === item.id && i.type === item.type))
        : [...prev, item]
    );
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.category || newTask.assignedUsers.length === 0) return;

    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        setShowCreateTaskModal(false);
        setNewTask({ title: '', category: '', description: '', dueDate: '', assignedUsers: [] });
        setSuccessMessage('Task created and assigned successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchAvailableItems();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const toggleUserSelection = (userId: number) => {
    setNewTask(prev => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter(id => id !== userId)
        : [...prev.assignedUsers, userId]
    }));
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Assignment Manager</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Icon name="plus" className="w-5 h-5 mr-2" />
            Create Task
          </Button>
          <Button onClick={() => {
            if (selectedUser) {
              fetchExistingAssignments(selectedUser.id);
              setShowAssignModal(true);
            }
          }} disabled={!selectedUser}>
            <Icon name="clipboard-document-list" className="w-5 h-5 mr-2" />
            Assign Items
          </Button>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Employees</h2>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by name..."
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
            />
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
            >
              <option value="">All Teams</option>
              {[...new Set(users.map(u => u.team).filter(Boolean))].map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-sm"
            >
              <option value="">All Roles</option>
              {[...new Set(users.map(u => u.role))].map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users
              .filter(user => 
                user.name.toLowerCase().includes(employeeFilter.toLowerCase()) &&
                (teamFilter === '' || user.team === teamFilter) &&
                (roleFilter === '' || user.role === roleFilter)
              )
              .map(user => (
                <div
                  key={user.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    fetchExistingAssignments(user.id);
                  }}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user.team} - {user.role}</p>
                </div>
              ))
            }
          </div>
        </Card>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <Modal isOpen={true} onClose={() => setShowAssignModal(false)} title={`Assign Items to ${selectedUser?.name}`}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tasks</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableItems.tasks.map(task => (
                    <label key={task.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(i => i.id === task.id && i.type === 'task') || existingAssignments.includes(`task-${task.id}`)}
                        onChange={() => toggleItemSelection(task)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{task.title} ({task.category})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Policies</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableItems.policies.map(policy => (
                    <label key={policy.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(i => i.id === policy.id && i.type === 'policy') || existingAssignments.includes(`policy-${policy.id}`)}
                        onChange={() => toggleItemSelection(policy)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{policy.title} ({policy.category})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Training</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableItems.training.map(training => (
                    <label key={training.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(i => i.id === training.id && i.type === 'training') || existingAssignments.includes(`training-${training.id}`)}
                        onChange={() => toggleItemSelection(training)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{training.title} ({training.category})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignItems} disabled={selectedItems.length === 0}>
                Assign {selectedItems.length} Items
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <Modal isOpen={true} onClose={() => setShowCreateTaskModal(false)} title="Create New Task">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Title</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              >
                <option value="">Select Category</option>
                <option value="General">General</option>
                <option value="Paperwork">Paperwork</option>
                <option value="IT Setup">IT Setup</option>
                <option value="Training">Training</option>
                <option value="Meetings">Meetings</option>
                <option value="Compliance">Compliance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (Optional)</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                rows={3}
                placeholder="Task description or instructions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date</label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign to Employees</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md p-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      checked={newTask.assignedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{user.name} ({user.team})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowCreateTaskModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTask} 
                disabled={!newTask.title || !newTask.category || newTask.assignedUsers.length === 0}
              >
                Create & Assign Task
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssignmentManager;