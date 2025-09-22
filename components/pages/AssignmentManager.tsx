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
  const [dueDate, setDueDate] = useState('');
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: '',
    description: '',
    dueDate: '',
    assignedUsers: [] as number[]
  });

  useEffect(() => {
    fetchUsers();
    fetchAvailableItems();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      const data = await response.json();
      setUsers(data.filter((u: User) => u.role === 'Employee'));
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

  const handleAssignItems = async () => {
    if (!selectedUser || selectedItems.length === 0) return;

    try {
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        alert('Items assigned successfully!');
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
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newTask)
      });

      if (response.ok) {
        setShowCreateTaskModal(false);
        setNewTask({ title: '', category: '', description: '', dueDate: '', assignedUsers: [] });
        alert('Task created and assigned successfully!');
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Assignment Manager</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateTaskModal(true)}>
            <Icon name="plus" className="w-5 h-5 mr-2" />
            Create Task
          </Button>
          <Button onClick={() => setShowAssignModal(true)} disabled={!selectedUser}>
            <Icon name="clipboard-document-list" className="w-5 h-5 mr-2" />
            Assign Items
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">Employees</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map(user => (
              <div
                key={user.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser?.id === user.id
                    ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.team} - {user.role}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Common Items (All Employees)</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Required Policies</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                <li>• Code of Conduct</li>
                <li>• IT Security Policy</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Required Training</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                <li>• Welcome to Company</li>
                <li>• Security Training</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-300">Common Tasks</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 ml-4">
                <li>• Complete profile setup</li>
                <li>• Upload required documents</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <Modal isOpen={true} onClose={() => setShowAssignModal(false)} title={`Assign Items to ${selectedUser?.name}`}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Tasks</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableItems.tasks.map(task => (
                    <label key={task.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(i => i.id === task.id && i.type === 'task')}
                        onChange={() => toggleItemSelection(task)}
                        className="mr-2"
                      />
                      <span className="text-sm">{task.title} ({task.category})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Policies</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableItems.policies.map(policy => (
                    <label key={policy.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(i => i.id === policy.id && i.type === 'policy')}
                        onChange={() => toggleItemSelection(policy)}
                        className="mr-2"
                      />
                      <span className="text-sm">{policy.title} ({policy.category})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Training</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableItems.training.map(training => (
                    <label key={training.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.some(i => i.id === training.id && i.type === 'training')}
                        onChange={() => toggleItemSelection(training)}
                        className="mr-2"
                      />
                      <span className="text-sm">{training.title} ({training.category})</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Task description or instructions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Employees</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      checked={newTask.assignedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">{user.name} ({user.team})</span>
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