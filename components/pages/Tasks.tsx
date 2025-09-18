
import React, { useState, useEffect } from 'react';
import { Task, TaskStatus } from '../../types';
import Card from '../common/Card';
import Icon from '../common/Icon';

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
        <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
                <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    checked={isCompleted}
                    onChange={() => onStatusChange(task.id, isCompleted ? TaskStatus.ToDo : TaskStatus.Completed)}
                />
                <div className="ml-4">
                    <p className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.title}</p>
                    <p className="text-sm text-gray-500">Due: {task.dueDate}</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                 <span className="text-sm text-gray-500 hidden md:block">{task.category}</span>
                {getStatusBadge(task.status)}
            </div>
        </div>
    );
};

const Tasks: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await fetch('/api/tasks', {
                credentials: 'include'
            });
            const tasksData = await response.json();
            // Convert database format to frontend format
            const formattedTasks = tasksData.map((task: any) => ({
                id: task.id.toString(),
                title: task.title,
                status: task.status as TaskStatus,
                dueDate: '2024-01-15', // Default date
                category: 'General' // Default category
            }));
            setTasks(formattedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
        console.log('Attempting to update task:', id, 'to status:', newStatus);
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus })
            });
            
            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);
            
            if (response.ok) {
                setTasks(tasks.map(task => task.id === id ? { ...task, status: newStatus } : task));
                // Trigger progress update on dashboard by dispatching custom event
                window.dispatchEvent(new CustomEvent('taskUpdated'));
                console.log('Task updated successfully in UI');
            } else {
                console.error('Failed to update task status:', responseData);
            }
        } catch (error) {
            console.error('Error updating task:', error);
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
             <div>
                <h1 className="text-3xl font-bold text-gray-800">Your Onboarding Tasks</h1>
                <p className="text-gray-600 mt-1">Complete these tasks to get up to speed.</p>
            </div>
            
            {Object.entries(groupedTasks).map(([category, tasksInCategory]) => (
                <Card key={category}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">{category}</h2>
                    <div className="space-y-3">
                    {tasksInCategory.map(task => (
                        <TaskItem key={task.id} task={task} onStatusChange={handleStatusChange} />
                    ))}
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default Tasks;
