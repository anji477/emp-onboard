
import React, { useState, useEffect, useContext } from 'react';
import { Task, TaskStatus } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { UserContext } from '../../App';

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

const TaskItem: React.FC<{ task: Task, onStatusChange: (id: string, status: TaskStatus) => void }> = ({ task, onStatusChange }) => {
    const isCompleted = task.status === TaskStatus.Completed;
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
                    <p className={`font-medium ${isCompleted ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</p>
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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [newTask, setNewTask] = useState({
        title: '',
        category: '',
        dueDate: '',
        assignedUsers: [] as number[]
    });
    const auth = useContext(UserContext);
    const isAdminOrHR = auth?.user?.role === 'Admin' || auth?.user?.role === 'HR';

    useEffect(() => {
        if (auth?.user?.id) {
            fetchTasks();
        }
    }, [auth?.user?.id]);

    const fetchTasks = async () => {
        try {
            const userId = auth?.user?.id || '6';
            console.log('Fetching tasks for user ID:', userId);
            
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
                    dueDate: assignment.due_date || '2024-01-15',
                    category: assignment.item_category || 'General'
                }));
            console.log('Filtered assigned tasks:', assignedTasks);
            
            // Combine and format all tasks
            const allTasks = [
                ...directTasks.map((task: any) => ({
                    id: task.id.toString(),
                    title: task.title,
                    status: task.status as TaskStatus,
                    dueDate: task.due_date || '2024-01-15',
                    category: task.category || 'General'
                })),
                ...assignedTasks
            ];
            console.log('All combined tasks:', allTasks);
            
            setTasks(allTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
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
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {isAdminOrHR ? 'Task Management' : 'Your Onboarding Tasks'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
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
            
            {tasks.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Icon name="clipboard-document-list" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tasks found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {isAdminOrHR ? 'Create tasks to assign to employees.' : 'No tasks have been assigned to you yet.'}
                        </p>
                    </div>
                </Card>
            ) : (
                Object.entries(groupedTasks).map(([category, tasksInCategory]) => (
                    <Card key={category}>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">{category}</h2>
                        <div className="space-y-3">
                        {tasksInCategory.map(task => (
                            <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} />
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
                        </select>
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
                                    }
                                }}
                                disabled={!newTask.title || !newTask.category || newTask.assignedUsers.length === 0}
                            >
                                Create Task
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Tasks;
