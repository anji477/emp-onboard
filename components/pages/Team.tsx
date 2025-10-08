
import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../App';
import Card from '../common/Card';
import Icon from '../common/Icon';
import { UserRole } from '../../types';

const Team: React.FC = () => {
    const auth = useContext(UserContext);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [updating, setUpdating] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', team: '', job_title: '', roles: [UserRole.Employee] });
    const [adding, setAdding] = useState(false);
    
    const allRoles = [UserRole.Employee, UserRole.Manager, UserRole.HR, UserRole.Admin, UserRole.IT];

    useEffect(() => {
        fetchTeamMembers();
    }, []);

    const fetchTeamMembers = async () => {
        try {
            const response = await fetch('/api/users', {
                credentials: 'include'
            });
            if (response.ok) {
                const users = await response.json();
                setTeamMembers(users);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleEditRoles = (user: any) => {
        setEditingUser(user);
        setSelectedRoles(user.availableRoles || [user.role]);
    };
    
    const handleUpdateRoles = async () => {
        if (!editingUser || selectedRoles.length === 0) return;
        
        try {
            setUpdating(true);
            
            // Get CSRF token
            const csrfResponse = await fetch('/api/csrf-token');
            const { csrfToken } = await csrfResponse.json();
            
            const response = await fetch(`/api/users/${editingUser.id}/roles`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({ roles: selectedRoles })
            });
            
            if (response.ok) {
                await fetchTeamMembers();
                setEditingUser(null);
                setSelectedRoles([]);
            }
        } catch (error) {
            console.error('Error updating roles:', error);
        } finally {
            setUpdating(false);
        }
    };
    
    const toggleRole = (role: UserRole) => {
        setSelectedRoles(prev => 
            prev.includes(role) 
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };
    
    const toggleNewUserRole = (role: UserRole) => {
        const sanitizedRole = String(role).replace(/[\r\n\t]/g, ' ').substring(0, 50);
        const sanitizedRoles = JSON.stringify(newUser.roles).replace(/[\r\n\t]/g, ' ').substring(0, 100);
        console.log('Toggling role:', sanitizedRole);
        console.log('Current roles:', sanitizedRoles);
        setNewUser(prev => {
            const newRoles = prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role];
            console.log('New roles:', JSON.stringify(newRoles).replace(/[\r\n\t]/g, ' ').substring(0, 100));
            return {
                ...prev,
                roles: newRoles
            };
        });
    };
    
    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password || newUser.roles.length === 0) return;
        
        try {
            setAdding(true);
            
            // Get CSRF token
            const csrfResponse = await fetch('/api/csrf-token');
            const { csrfToken } = await csrfResponse.json();
            
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify({
                    ...newUser,
                    role: newUser.roles[0] // Primary role
                })
            });
            
            if (response.ok) {
                const user = await response.json();
                // Add multiple roles
                await fetch(`/api/users/${user.id}/roles`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    credentials: 'include',
                    body: JSON.stringify({ roles: newUser.roles })
                });
                
                await fetchTeamMembers();
                setShowAddUser(false);
                setNewUser({ name: '', email: '', password: '', team: '', job_title: '', roles: [UserRole.Employee] });
            }
        } catch (error) {
            console.error('Error adding user:', error);
        } finally {
            setAdding(false);
        }
    };

    if (!auth || !auth.user) {
        return null;
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const { user } = auth;
    const currentUserTeam = user.team || 'Management';
    const teamPeers = teamMembers.filter(member => 
        member.team === currentUserTeam && member.id !== user.id
    );
    const manager = teamMembers.find(member => 
        (member.role === 'Admin' || member.role === 'HR') && member.id !== user.id
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Team & Directory</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">Get to know your manager and colleagues.</p>
            </div>

            <Card>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">Your Reporting Line</h2>
                <div className="flex flex-col items-center">
                    {manager ? (
                         <>
                         <div className="flex flex-col items-center">
                             <img 
                                className="h-24 w-24 rounded-full object-cover" 
                                src={manager.avatar_url || `https://ui-avatars.com/api/?name=${manager.name}&background=6366f1&color=fff`} 
                                alt={manager.name} 
                             />
                             <h3 className="mt-2 text-base font-semibold text-gray-800 dark:text-gray-200">{manager.name}</h3>
                             <p className="text-gray-600 dark:text-gray-400">{manager.role} (Manager)</p>
                         </div>
                         <div className="flex items-center justify-center my-4">
                             <div className="w-8 h-px bg-gray-300"></div>
                             <svg className="mx-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                             </svg>
                             <div className="w-8 h-px bg-gray-300"></div>
                         </div>
                         </>
                    ) : (
                        <div className="text-center mb-6">
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No manager assigned</p>
                            <div className="flex items-center justify-center my-4">
                                <div className="w-8 h-px bg-gray-300"></div>
                                <svg className="mx-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                <div className="w-8 h-px bg-gray-300"></div>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-center">
                         <img 
                            className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-500" 
                            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.name}&background=6366f1&color=fff`} 
                            alt={user.name} 
                         />
                         <h3 className="mt-2 text-base font-semibold text-gray-800 dark:text-gray-200">{user.name} (You)</h3>
                         <p className="text-gray-600 dark:text-gray-400">{user.role}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Your Team: {currentUserTeam}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teamPeers.length > 0 ? (
                        teamPeers.map(member => (
                            <div key={member.id} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <img 
                                    className="h-20 w-20 rounded-full object-cover mx-auto" 
                                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.name}&background=6366f1&color=fff`} 
                                    alt={member.name} 
                                />
                                <h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{member.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{member.role}</p>
                                <a href={`mailto:${member.email}`} className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                                    <Icon name="envelope" className="h-4 w-4 mr-1"/> Email
                                </a>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-8">
                            <p className="text-gray-500 dark:text-gray-400">No other team members found in {currentUserTeam}</p>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Employee Directory</h2>
                    {auth.user.role === 'Admin' && (
                        <button
                            onClick={() => setShowAddUser(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Add User
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Team</th>
                                {auth.user.role === 'Admin' && (
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {teamMembers.map(member => (
                                <tr key={member.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <img className="h-10 w-10 rounded-full" src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.name}&background=6366f1&color=fff`} alt={member.name} />
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {(member.availableRoles || [member.role]).map((role: string) => (
                                                <span key={role} className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    role === 'Admin' ? 'bg-red-100 text-red-800' :
                                                    role === 'HR' ? 'bg-purple-100 text-purple-800' :
                                                    role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                                                    role === 'IT' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}>
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{member.team || 'N/A'}</td>
                                    {auth.user.role === 'Admin' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleEditRoles(member)}
                                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                            >
                                                Edit Roles
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {/* Add User Modal */}
            {showAddUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add New User</h3>
                            <button
                                onClick={() => setShowAddUser(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <Icon name="x-mark" className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team</label>
                                <input
                                    type="text"
                                    value={newUser.team}
                                    onChange={(e) => setNewUser({...newUser, team: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    value={newUser.job_title}
                                    onChange={(e) => setNewUser({...newUser, job_title: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Roles</label>
                                <div className="relative">
                                    <select
                                        multiple
                                        value={newUser.roles}
                                        onChange={(e) => {
                                            const selectedRoles = Array.from(e.target.selectedOptions, option => option.value as UserRole);
                                            setNewUser({...newUser, roles: selectedRoles});
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                        size={5}
                                    >
                                        {allRoles.map(role => (
                                            <option key={role} value={role}>
                                                {role}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple roles</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddUser(false)}
                                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={adding || !newUser.name || !newUser.email || !newUser.password || newUser.roles.length === 0}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {adding ? 'Adding...' : 'Add User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Role Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Edit Roles for {editingUser.name}</h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <Icon name="x-mark" className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {allRoles.map(role => (
                                <label key={role} className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(role)}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            toggleRole(role);
                                        }}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{role}</span>
                                </label>
                            ))}
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateRoles}
                                disabled={updating || selectedRoles.length === 0}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {updating ? 'Updating...' : 'Update Roles'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Team;
