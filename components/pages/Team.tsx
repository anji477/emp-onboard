
import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../App';
import Card from '../common/Card';
import Icon from '../common/Icon';

const Team: React.FC = () => {
    const auth = useContext(UserContext);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Team & Directory</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Get to know your manager and colleagues.</p>
            </div>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">Your Reporting Line</h2>
                <div className="flex flex-col items-center">
                    {manager ? (
                         <>
                         <div className="flex flex-col items-center">
                             <img 
                                className="h-24 w-24 rounded-full object-cover" 
                                src={manager.avatar_url || `https://ui-avatars.com/api/?name=${manager.name}&background=6366f1&color=fff`} 
                                alt={manager.name} 
                             />
                             <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-200">{manager.name}</h3>
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
                         <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-gray-200">{user.name} (You)</h3>
                         <p className="text-gray-600 dark:text-gray-400">{user.role}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Your Team: {currentUserTeam}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {teamPeers.length > 0 ? (
                        teamPeers.map(member => (
                            <div key={member.id} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <img 
                                    className="h-20 w-20 rounded-full object-cover mx-auto" 
                                    src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.name}&background=6366f1&color=fff`} 
                                    alt={member.name} 
                                />
                                <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">{member.name}</h3>
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
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Employee Directory</h2>
                 <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                         <Icon name="magnifying-glass" className="h-5 w-5 text-gray-500" />
                    </span>
                    <input className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500" type="text" placeholder="Search for anyone in the company..." />
                </div>
            </Card>
        </div>
    );
};

export default Team;
