
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../App';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import Icon from '../common/Icon';
import Modal from '../common/Modal';

const AdminDashboard: React.FC = () => {
    const auth = useContext(UserContext);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [userDetails, setUserDetails] = useState<any>(null);
    const [stats, setStats] = useState({
        newHires: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0
    });
    
    if (!auth?.user || auth.user.role !== 'Admin') {
        return <div>Access denied. Admin privileges required.</div>;
    }
    
    useEffect(() => {
        fetchUsers();
        fetchStats();
    }, []);
    
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            const usersData = await response.json();
            
            // Fetch progress for each user
            const usersWithProgress = await Promise.all(
                usersData.map(async (user: any) => {
                    try {
                        const progressResponse = await fetch(`/api/users/${user.id}/progress`, {
                            credentials: 'include'
                        });
                        const progressData = await progressResponse.json();
                        return {
                            ...user,
                            progress: progressData.progress || 0,
                            status: progressData.progress >= 100 ? 'Completed' : 
                                   progressData.progress >= 50 ? 'On Track' : 'Delayed'
                        };
                    } catch (error) {
                        console.error(`Error fetching progress for user ${user.id}:`, error);
                        return { ...user, progress: 0, status: 'Delayed' };
                    }
                })
            );
            
            setUsers(usersWithProgress);
            
            // Calculate stats from users data
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const newHires = usersWithProgress.filter(user => {
                if (!user.start_date) return false;
                const startDate = new Date(user.start_date);
                return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
            }).length;
            
            const inProgress = usersWithProgress.filter(user => 
                user.progress > 0 && user.progress < 100
            ).length;
            
            const completed = usersWithProgress.filter(user => 
                user.progress >= 100
            ).length;
            
            setStats({
                newHires,
                inProgress,
                completed,
                overdue: 0 // Will calculate from tasks
            });
            
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };
    
    const fetchStats = async () => {
        try {
            // Fetch overdue tasks count
            const response = await fetch('/api/admin/stats', {
                credentials: 'include'
            });
            if (response.ok) {
                const statsData = await response.json();
                setStats(prev => ({ ...prev, overdue: statsData.overdueTasks }));
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };
    
    const viewUserDetails = async (user: any) => {
        try {
            setSelectedUser(user);
            
            // Fetch user's tasks
            const tasksResponse = await fetch(`/api/users/${user.id}/tasks`, {
                credentials: 'include'
            });
            const tasks = await tasksResponse.json();
            
            // Fetch user's progress breakdown
            const progressResponse = await fetch(`/api/users/${user.id}/progress`, {
                credentials: 'include'
            });
            const progress = await progressResponse.json();
            
            setUserDetails({
                ...user,
                tasks,
                progressBreakdown: progress.breakdown
            });
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };
    
    const statusColor = (status: 'On Track' | 'Delayed' | 'Completed') => {
        switch (status) {
            case 'On Track': return 'bg-green-100 text-green-800';
            case 'Delayed': return 'bg-red-100 text-red-800';
            case 'Completed': return 'bg-blue-100 text-blue-800';
        }
    };
    
    const dashboardStats = [
        { label: 'New Hires This Month', value: stats.newHires.toString(), icon: 'user-plus' },
        { label: 'Onboarding In Progress', value: stats.inProgress.toString(), icon: 'rocket-launch' },
        { label: 'Completed This Month', value: stats.completed.toString(), icon: 'check-badge' },
        { label: 'Tasks Overdue', value: stats.overdue.toString(), icon: 'exclamation-triangle' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">Monitor and manage employee onboarding across the organization.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dashboardStats.map(stat => (
                    <Card key={stat.label}>
                         <div className="flex items-center">
                            <div className="p-3 bg-indigo-100 rounded-full">
                                <Icon name={stat.icon} className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">{stat.value}</p>
                            </div>
                         </div>
                    </Card>
                ))}
            </div>

            <Card>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">New Hire Onboarding Status</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(employee => (
                                <tr key={employee.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${employee.name}&background=6366f1&color=fff`} alt="" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{employee.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{employee.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {employee.start_date ? new Date(employee.start_date).toLocaleDateString() : 'Not set'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-40">
                                              <ProgressBar progress={employee.progress || 0} small />
                                            </div>
                                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">{employee.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(employee.status || 'Delayed')}`}>
                                            {employee.status || 'Delayed'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => viewUserDetails(employee)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {/* User Details Modal */}
            {userDetails && (
                <Modal 
                    isOpen={!!userDetails} 
                    onClose={() => { setUserDetails(null); setSelectedUser(null); }}
                    title={`${userDetails.name} - Onboarding Details`}
                >
                    <div className="space-y-6">
                        {/* User Info */}
                        <div className="flex items-center space-x-4">
                            <img 
                                className="h-16 w-16 rounded-full" 
                                src={`https://ui-avatars.com/api/?name=${userDetails.name}&background=6366f1&color=fff`} 
                                alt="" 
                            />
                            <div>
                                <h3 className="text-base font-semibold">{userDetails.name}</h3>
                                <p className="text-gray-600">{userDetails.email}</p>
                                <p className="text-sm text-gray-500">{userDetails.role} • {userDetails.team}</p>
                            </div>
                        </div>
                        
                        {/* Progress Overview */}
                        <div>
                            <h4 className="font-semibold mb-3">Overall Progress</h4>
                            <ProgressBar progress={userDetails.progress || 0} />
                            <p className="text-sm text-gray-600 mt-2">{userDetails.progress || 0}% Complete</p>
                        </div>
                        
                        {/* Progress Breakdown */}
                        {userDetails.progressBreakdown && (
                            <div>
                                <h4 className="font-semibold mb-3">Progress Breakdown</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span>Tasks</span>
                                        <span>{userDetails.progressBreakdown.tasks?.completed || 0}/{userDetails.progressBreakdown.tasks?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Documents</span>
                                        <span>{userDetails.progressBreakdown.documents?.completed || 0}/{userDetails.progressBreakdown.documents?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Training</span>
                                        <span>{userDetails.progressBreakdown.training?.completed || 0}/{userDetails.progressBreakdown.training?.total || 0}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Tasks List */}
                        {userDetails.tasks && userDetails.tasks.length > 0 && (
                            <div>
                                <h4 className="font-semibold mb-3">Tasks ({userDetails.tasks.length})</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {userDetails.tasks.map((task: any) => (
                                        <div key={task.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <span className="text-sm">{task.title}</span>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                task.status === 'InProgress' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AdminDashboard;
