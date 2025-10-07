
import React, { useState, useEffect, useContext } from 'react';
import { Task, TaskStatus } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Loader from '../common/Loader';
import { UserContext } from '../../App';
import { formatDateForInput, formatDateForDisplay } from '../../utils/dateUtils';

const getStatusBadge = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.Completed:
      return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Completed</span>;
    case TaskStatus.InProgress:
      return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">In Progress</span>;
    case TaskStatus.ToDo:
      return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">To Do</span>;
  }
};

const TaskItem: React.FC<{ task: Task, onStatusChange: (id: string, status: TaskStatus) => void, isAdminView?: boolean, onEdit?: (task: Task) => void, onDelete?: (id: string) => void }> = ({ task, onStatusChange, isAdminView = false, onEdit, onDelete }) => {
    const isCompleted = task.status === TaskStatus.Completed;
    
    if (isAdminView) {
        // Admin/HR view with edit/delete buttons
        return (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center">
                    <div className="w-5 h-5 flex items-center justify-center">
                        <Icon name="clipboard-document-list" className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{task.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Due: {task.dueDate}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{task.category}</span>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => onEdit?.(task)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="Edit task"
                        >
                            <Icon name="pencil" className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete?.(task.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete task"
                        >
                            <Icon name="trash" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Employee view - interactive with checkboxes
    return (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={isCompleted}
                    onChange={() => onStatusChange(task.id, isCompleted ? TaskStatus.ToDo : TaskStatus.Completed)}
                />
                <div className="ml-4">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Due: {task.dueDate}</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                 <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{task.category}</span>
                {getStatusBadge(task.status)}
            </div>
        </div>
    );
};

const Tasks: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [newTask, setNewTask] = useState({
        title: '',
        category: '',
        dueDate: '',
        assignedUsers: [] as number[]
    });
    const [newCategory, setNewCategory] = useState({
        name: '',
        description: '',
        color: '#6366f1'
    });
    const [addingCategory, setAddingCategory] = useState(false);
    const [categoryError, setCategoryError] = useState('');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        category: '',
        dueDate: ''
    });
    const [notification, setNotification] = useState('');
    const [updating, setUpdating] = useState(false);
    const auth = useContext(UserContext);
    const isAdminOrHR = auth?.user?.role === 'Admin' || auth?.user?.role === 'HR';

    useEffect(() => {
        if (auth?.user?.id) {
            fetchTasks();
            fetchCategories();
        }
    }, [auth?.user?.id]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/task-categories', {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            } else {
                console.error('Categories API failed, using defaults');
                // Use default categories if API fails
                setCategories([
                    { id: 1, name: 'General', description: 'General tasks' },
                    { id: 2, name: 'Paperwork', description: 'Document tasks' },
                    { id: 3, name: 'IT Setup', description: 'Technology setup' },
                    { id: 4, name: 'Training', description: 'Learning tasks' },
                    { id: 5, name: 'HR', description: 'HR related tasks' }
                ]);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            // Use default categories on error
            setCategories([
                { id: 1, name: 'General', description: 'General tasks' },
                { id: 2, name: 'Paperwork', description: 'Document tasks' },
                { id: 3, name: 'IT Setup', description: 'Technology setup' },
                { id: 4, name: 'Training', description: 'Learning tasks' },
                { id: 5, name: 'HR', description: 'HR related tasks' }
            ]);
        }
    };



    const fetchTasks = async () => {
        try {
            setLoading(true);
            const userId = auth?.user?.id || '6';
            console.log('Fetching tasks for user ID:', userId, 'Role:', auth?.user?.role);
            
            if (isAdminOrHR) {
                // Admin/HR sees all tasks from tasks table only
                const allTasksResponse = await fetch('/api/tasks', {
                    credentials: 'include'
                });
                const allTasks = await allTasksResponse.json();
                console.log('All tasks for admin:', allTasks);
                
                // Remove duplicates by task ID
                const uniqueTasks = allTasks.filter((task: any, index: number, self: any[]) => 
                    index === self.findIndex((t: any) => t.id === task.id)
                );
                
                const formattedTasks = uniqueTasks.map((task: any) => ({
                    id: task.id.toString(),
                    title: task.title,
                    status: task.status as TaskStatus,
                    dueDate: formatDateForDisplay(task.due_date),
                    category: task.category || 'General'
                }));
                
                setTasks(formattedTasks);
            } else {
                // Regular users see only their own tasks
                // Fetch direct tasks
                const directTasksResponse = await fetch(`/api/users/${userId}/tasks`, {
                    credentials: 'include'
                });
                const directTasks = await directTasksResponse.json();
                console.log('Direct tasks:', directTasks);
                
                // Fetch assigned tasks from assignments
                const assignedTasksResponse = await fetch(`/api/assignments/${userId}`, {
                    credentials: 'include'
                });
                const assignments = await assignedTasksResponse.json();
                console.log('All assignments:', assignments);
                
                // Filter only task assignments and format them
                const assignedTasks = assignments
                    .filter((assignment: any) => assignment.item_type === 'task')
                    .map((assignment: any) => ({
                        id: `assigned-${assignment.item_id}`,
                        title: assignment.item_title || 'Assigned Task',
                        status: assignment.status === 'completed' ? TaskStatus.Completed : TaskStatus.ToDo,
                        dueDate: formatDateForDisplay(assignment.due_date),
                        category: assignment.item_category || 'General'
                    }));
                console.log('Filtered assigned tasks:', assignedTasks);
                
                // Combine and format all tasks
                const allTasks = [
                    ...directTasks.map((task: any) => ({
                        id: task.id.toString(),
                        title: task.title,
                        status: task.status as TaskStatus,
                        dueDate: formatDateForDisplay(task.due_date),
                        category: task.category || 'General'
                    })),
                    ...assignedTasks
                ];
                console.log('All combined tasks:', allTasks);
                
                setTasks(allTasks);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
        // Update UI immediately for better UX
        setTasks(prevTasks => 
            prevTasks.map(task => 
                task.id === id ? { ...task, status: newStatus } : task
            )
        );
        
        try {
            let response;
            
            if (id.startsWith('assigned-')) {
                // Handle assigned task - update user_assignments table
                const assignmentId = id.replace('assigned-', '');
                const userId = auth?.user?.id;
                const assignmentStatus = newStatus === TaskStatus.Completed ? 'completed' : 'pending';
                
                response = await fetch(`/api/assignments/${userId}/task/${assignmentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: assignmentStatus })
                });
            } else {
                // Handle direct task - update tasks table
                response = await fetch(`/api/tasks/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: newStatus })
                });
            }
            
            if (response.ok) {
                window.dispatchEvent(new CustomEvent('taskUpdated'));
            } else {
                // Revert UI change if API call failed
                setTasks(prevTasks => 
                    prevTasks.map(task => 
                        task.id === id ? { ...task, status: newStatus === TaskStatus.Completed ? TaskStatus.ToDo : TaskStatus.Completed } : task
                    )
                );
            }
        } catch (error) {
            // Revert UI change if API call failed
            setTasks(prevTasks => 
                prevTasks.map(task => 
                    task.id === id ? { ...task, status: newStatus === TaskStatus.Completed ? TaskStatus.ToDo : TaskStatus.Completed } : task
                )
            );
        }
    };

    const groupedTasks = tasks.reduce((acc, task) => {
        const category = task.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        {isAdminOrHR ? 'Task Management' : 'Your Onboarding Tasks'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                        {isAdminOrHR ? 'Create and manage employee tasks.' : 'Complete these tasks to get up to speed.'}
                    </p>
                </div>
                {isAdminOrHR && (
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Icon name="plus" className="w-5 h-5 mr-2" />
                        Create Task
                    </Button>
                )}
            </div>
            
            {loading ? (
                <Card>
                    <div className="flex justify-center py-12">
                        <Loader text="Loading tasks..." />
                    </div>
                </Card>
            ) : tasks.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Icon name="clipboard-document-list" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">No tasks found</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {isAdminOrHR ? 'Create tasks to assign to employees.' : 'No tasks have been assigned to you yet.'}
                        </p>
                    </div>
                </Card>
            ) : (
                Object.entries(groupedTasks).map(([category, tasksInCategory]) => (
                    <Card key={category}>
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{category}</h2>
                        <div className="space-y-3">
                        {tasksInCategory.map(task => (
                            <TaskItem 
                                key={task.id} 
                                task={task} 
                                onStatusChange={handleStatusChange} 
                                isAdminView={isAdminOrHR}
                                onEdit={isAdminOrHR ? (task) => {
                                    setEditingTask(task);
                                    setEditForm({
                                        title: task.title,
                                        category: task.category,
                                        dueDate: formatDateForInput(task.dueDate)
                                    });
                                } : undefined}
                                onDelete={isAdminOrHR ? (id) => setShowDeleteConfirm(id) : undefined}
                            />
                        ))}
                        </div>
                    </Card>
                ))
            )}

            {showCreateModal && (
                <Modal isOpen={true} onClose={() => setShowCreateModal(false)} title="Create New Task">
                    <div className="space-y-4">
                        <input
                            type="text"
                            value={newTask.title}
                            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Task title"
                        />
                        <div className="flex gap-2">
                            <select
                                value={newTask.category}
                                onChange={(e) => setNewTask({...newTask, category: e.target.value})}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                            <Button type="button" size="sm" onClick={() => setShowCategoryModal(true)}>
                                <Icon name="plus" className="w-4 h-4" />
                            </Button>
                        </div>
                        <input
                            type="date"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2 mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Assign to:</label>
                            <label className="flex items-center py-1">
                                <input
                                    type="checkbox"
                                    checked={newTask.assignedUsers.includes(1)}
                                    onChange={() => {
                                        const userId = 1;
                                        setNewTask(prev => ({
                                            ...prev,
                                            assignedUsers: prev.assignedUsers.includes(userId)
                                                ? prev.assignedUsers.filter(id => id !== userId)
                                                : [...prev.assignedUsers, userId]
                                        }));
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">Admin User (Admin)</span>
                            </label>
                            <label className="flex items-center py-1">
                                <input
                                    type="checkbox"
                                    checked={newTask.assignedUsers.includes(8)}
                                    onChange={() => {
                                        const userId = 8;
                                        setNewTask(prev => ({
                                            ...prev,
                                            assignedUsers: prev.assignedUsers.includes(userId)
                                                ? prev.assignedUsers.filter(id => id !== userId)
                                                : [...prev.assignedUsers, userId]
                                        }));
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">HR Manager (HR)</span>
                            </label>
                            <label className="flex items-center py-1">
                                <input
                                    type="checkbox"
                                    checked={newTask.assignedUsers.includes(6)}
                                    onChange={() => {
                                        const userId = 6;
                                        setNewTask(prev => ({
                                            ...prev,
                                            assignedUsers: prev.assignedUsers.includes(userId)
                                                ? prev.assignedUsers.filter(id => id !== userId)
                                                : [...prev.assignedUsers, userId]
                                        }));
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">Alex Doe (Employee)</span>
                            </label>
                            <label className="flex items-center py-1">
                                <input
                                    type="checkbox"
                                    checked={newTask.assignedUsers.includes(9)}
                                    onChange={() => {
                                        const userId = 9;
                                        setNewTask(prev => ({
                                            ...prev,
                                            assignedUsers: prev.assignedUsers.includes(userId)
                                                ? prev.assignedUsers.filter(id => id !== userId)
                                                : [...prev.assignedUsers, userId]
                                        }));
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">Sarah Johnson (Employee)</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button 
                                onClick={async () => {
                                    if (!newTask.title || !newTask.category || newTask.assignedUsers.length === 0) {
                                        alert('Please fill all required fields and select at least one employee');
                                        return;
                                    }
                                    try {
                                        setCreating(true);
                                        const response = await fetch('/api/tasks', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'include',
                                            body: JSON.stringify(newTask)
                                        });
                                        if (response.ok) {
                                            alert('Task created successfully!');
                                            setShowCreateModal(false);
                                            setNewTask({ title: '', category: '', dueDate: '', assignedUsers: [] });
                                            fetchTasks();
                                        } else {
                                            alert('Failed to create task');
                                        }
                                    } catch (error) {
                                        alert('Error creating task');
                                    } finally {
                                        setCreating(false);
                                    }
                                }}
                                disabled={!newTask.title || !newTask.category || newTask.assignedUsers.length === 0 || creating}
                            >
                                {creating ? (
                                    <div className="flex items-center">
                                        <Loader size="sm" color="white" />
                                        <span className="ml-2">Creating...</span>
                                    </div>
                                ) : 'Create Task'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <Modal isOpen={true} onClose={() => setShowCategoryModal(false)} title="Manage Categories">
                    <div className="space-y-6">
                        {/* Add New Category */}
                        <div className="border-b pb-4">
                            <h3 className="font-medium mb-3">Add New Category</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                                    placeholder="Category name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <input
                                    type="text"
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                                    placeholder="Description (optional)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={newCategory.color}
                                        onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                                        className="w-12 h-8 border border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-600">Category color</span>
                                </div>
                                {categoryError && (
                                    <div className="text-red-600 text-sm">{categoryError}</div>
                                )}
                                <Button 
                                    onClick={async () => {
                                        if (!newCategory.name.trim()) return;
                                        try {
                                            setAddingCategory(true);
                                            setCategoryError('');
                                            console.log('Creating category:', newCategory);
                                            
                                            const response = await fetch('/api/task-categories', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify(newCategory)
                                            });
                                            
                                            console.log('Response status:', response.status);
                                            const responseData = await response.json();
                                            console.log('Response data:', responseData);
                                            
                                            if (response.ok) {
                                                await fetchCategories();
                                                setNewCategory({ name: '', description: '', color: '#6366f1' });
                                            } else {
                                                setCategoryError(responseData.message || 'Failed to create category');
                                            }
                                        } catch (error) {
                                            console.error('Error creating category:', error);
                                            setCategoryError('Network error occurred');
                                        } finally {
                                            setAddingCategory(false);
                                        }
                                    }}
                                    disabled={!newCategory.name.trim() || addingCategory}
                                    size="sm"
                                >
                                    {addingCategory ? (
                                        <div className="flex items-center">
                                            <Loader size="sm" color="white" />
                                            <span className="ml-2">Adding...</span>
                                        </div>
                                    ) : 'Add Category'}
                                </Button>
                            </div>
                        </div>
                        
                        {/* Existing Categories */}
                        <div>
                            <h3 className="font-medium mb-3">Existing Categories</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {categories.map(category => (
                                    <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-4 h-4 rounded" 
                                                style={{ backgroundColor: category.color }}
                                            ></div>
                                            <div>
                                                <span className="font-medium">{category.name}</span>
                                                {category.description && (
                                                    <p className="text-xs text-gray-500">{category.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (confirm(`Delete category "${category.name}"?`)) {
                                                    try {
                                                        const response = await fetch(`/api/task-categories/${category.id}`, {
                                                            method: 'DELETE',
                                                            credentials: 'include'
                                                        });
                                                        if (response.ok) {
                                                            fetchCategories();
                                                        }
                                                    } catch (error) {
                                                        console.error('Error deleting category:', error);
                                                    }
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <Icon name="trash" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit Task Modal */}
            {editingTask && (
                <Modal isOpen={true} onClose={() => {
                    setEditingTask(null);
                    setUpdating(false);
                }} title="Edit Task">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={editForm.title}
                                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Task title"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                value={editForm.category}
                                onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={editForm.dueDate}
                                onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button 
                                variant="secondary" 
                                onClick={() => {
                                    setEditingTask(null);
                                    setUpdating(false);
                                }}
                                disabled={updating}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={async () => {
                                    if (!editForm.title.trim() || !editForm.category) {
                                        setNotification('Please fill in all required fields');
                                        setTimeout(() => setNotification(''), 3000);
                                        return;
                                    }
                                    
                                    try {
                                        setUpdating(true);
                                        console.log('Updating task with data:', {
                                            title: editForm.title,
                                            category: editForm.category,
                                            due_date: editForm.dueDate
                                        });
                                        
                                        const response = await fetch(`/api/tasks/${editingTask.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            credentials: 'include',
                                            body: JSON.stringify({
                                                title: editForm.title,
                                                category: editForm.category,
                                                due_date: editForm.dueDate
                                            })
                                        });
                                        
                                        const result = await response.json();
                                        console.log('Update response:', result);
                                        
                                        if (response.ok) {
                                            setNotification('Task updated successfully!');
                                            setEditingTask(null);
                                            fetchTasks();
                                            setTimeout(() => setNotification(''), 3000);
                                        } else {
                                            setNotification(result.message || 'Failed to update task');
                                            setTimeout(() => setNotification(''), 3000);
                                        }
                                    } catch (error) {
                                        console.error('Error updating task:', error);
                                        setNotification('Error updating task. Please try again.');
                                        setTimeout(() => setNotification(''), 3000);
                                    } finally {
                                        setUpdating(false);
                                    }
                                }}
                                disabled={updating || !editForm.title.trim() || !editForm.category}
                            >
                                {updating ? (
                                    <div className="flex items-center">
                                        <Loader size="sm" color="white" />
                                        <span className="ml-2">Updating...</span>
                                    </div>
                                ) : 'Update Task'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <Modal isOpen={true} onClose={() => setShowDeleteConfirm(null)} title="Delete Task">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <Icon name="exclamation-triangle" className="h-6 w-6 text-red-600" />
                            <p className="text-gray-700">Are you sure you want to delete this task? This action cannot be undone.</p>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
                            <Button 
                                onClick={async () => {
                                    try {
                                        const response = await fetch(`/api/tasks/${showDeleteConfirm}`, {
                                            method: 'DELETE',
                                            credentials: 'include'
                                        });
                                        if (response.ok) {
                                            setShowDeleteConfirm(null);
                                            fetchTasks();
                                        } else {
                                            alert('Failed to delete task');
                                        }
                                    } catch (error) {
                                        alert('Error deleting task');
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete Task
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
            {/* Notification */}
            {notification && (
                <div className="fixed top-4 right-4 z-50">
                    <div className={`px-4 py-2 rounded-md shadow-lg ${
                        notification.includes('success') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                        {notification}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tasks;
