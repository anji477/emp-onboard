
import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import Icon from '../common/Icon';

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    
    useEffect(() => {
        fetchUsers();
    }, []);
    
    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/users');
            const usersData = await response.json();
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };
    
    const statusColor = (status: 'On Track' | 'Delayed' | 'Completed') => {
        switch (status) {
            case 'On Track': return 'bg-green-100 text-green-800';
            case 'Delayed': return 'bg-red-100 text-red-800';
            case 'Completed': return 'bg-blue-100 text-blue-800';
        }
    };
    
    const stats = [
        { label: 'New Hires This Month', value: '12', icon: 'user-plus' },
        { label: 'Onboarding In Progress', value: '8', icon: 'rocket-launch' },
        { label: 'Completed This Month', value: '4', icon: 'check-badge' },
        { label: 'Tasks Overdue', value: '2', icon: 'exclamation-triangle' },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">Monitor and manage employee onboarding across the organization.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map(stat => (
                    <Card key={stat.label}>
                         <div className="flex items-center">
                            <div className="p-3 bg-indigo-100 rounded-full">
                                <Icon name={stat.icon} className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-500">{stat.label}</p>
                                <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
                            </div>
                         </div>
                    </Card>
                ))}
            </div>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">New Hire Onboarding Status</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(employee => (
                                <tr key={employee.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full" src={`https://ui-avatars.com/api/?name=${employee.name}&background=6366f1&color=fff`} alt="" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                                                <div className="text-sm text-gray-500">{employee.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2024-01-01</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-40">
                                              <ProgressBar progress={75} small />
                                            </div>
                                            <span className="ml-3 text-sm text-gray-600">75%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor('On Track')}`}>
                                            On Track
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <a href="#" className="text-indigo-600 hover:text-indigo-900">View Details</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AdminDashboard;
