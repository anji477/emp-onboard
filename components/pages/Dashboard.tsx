
import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserContext } from '../../App';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import Icon from '../common/Icon';
import { TaskStatus, Task } from '../../types';

const Dashboard: React.FC = () => {
  const auth = useContext(UserContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    fetchTasks();
    if (auth?.user?.id) {
      fetchProgress();
    }
    
    // Listen for task updates
    const handleTaskUpdate = () => {
      if (auth?.user?.id) {
        fetchProgress();
      }
    };
    
    window.addEventListener('taskUpdated', handleTaskUpdate);
    return () => window.removeEventListener('taskUpdated', handleTaskUpdate);
  }, [auth?.user?.id]);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        credentials: 'include'
      });
      const tasksData = await response.json();
      const formattedTasks = tasksData.map((task: any) => ({
        id: task.id.toString(),
        title: task.title,
        status: task.status as TaskStatus,
        dueDate: '2024-01-15',
        category: 'General'
      }));
      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/users/${auth?.user?.id}/progress`, {
        credentials: 'include'
      });
      const progressData = await response.json();
      setProgress(progressData.progress);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  if (!auth || !auth.user) return null;

  const { user } = auth;
  const upcomingTasks = tasks.filter(t => t.status !== TaskStatus.Completed).slice(0, 3);

  const quickLinks = [
    { to: '/tasks', icon: 'check-circle', label: 'My Tasks' },
    { to: '/documents', icon: 'document-text', label: 'Documents' },
    { to: '/training', icon: 'academic-cap', label: 'Training' },
    { to: '/team', icon: 'users', label: 'My Team' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user.name}!</h1>
        <p className="text-gray-600 mt-1">We're excited to have you on board. Here's a quick overview of your onboarding journey.</p>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Onboarding Progress</h2>
        <ProgressBar progress={progress} />
        <p className="text-sm text-gray-500 mt-2 text-right">{progress}% Complete</p>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map(link => (
              <Link key={link.to} to={link.to} className="block">
                <Card className="hover:shadow-lg hover:border-indigo-500 transition-all duration-200 h-full">
                    <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="p-4 bg-indigo-100 rounded-full mb-4">
                            <Icon name={link.icon} className="h-8 w-8 text-indigo-600" />
                        </div>
                        <h3 className="font-semibold text-gray-700">{link.label}</h3>
                    </div>
                </Card>
              </Link>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Upcoming Tasks</h2>
          <ul className="space-y-4">
            {upcomingTasks.map(task => (
              <li key={task.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{task.title}</p>
                  <p className="text-sm text-gray-500">Due: {task.dueDate}</p>
                </div>
                <Link to="/tasks" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">View</Link>
              </li>
            ))}
          </ul>
        </Card>
        {user.buddy && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Onboarding Buddy</h2>
            <div className="flex items-center space-x-4">
              <img className="h-20 w-20 rounded-full object-cover" src={user.buddy.avatarUrl} alt="Buddy" />
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{user.buddy.name}</h3>
                <p className="text-gray-600">{user.buddy.role}</p>
                <a href="#" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 mt-1 inline-block">Send a message</a>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
