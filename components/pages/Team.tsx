
import React, { useContext } from 'react';
import { mockTeamMembers } from '../../data/mockData';
import { UserContext } from '../../App';
import Card from '../common/Card';
import Icon from '../common/Icon';

const Team: React.FC = () => {
    const auth = useContext(UserContext);

    if (!auth || !auth.user) {
        return null;
    }

    const { user } = auth;
    const manager = mockTeamMembers.find(m => m.name === user.manager);
    const peers = mockTeamMembers.filter(m => m.name !== user.manager && m.name !== user.name);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Team & Directory</h1>
                <p className="text-gray-600 mt-1">Get to know your manager and colleagues.</p>
            </div>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-6">Your Reporting Line</h2>
                <div className="flex flex-col items-center">
                    {manager && (
                         <>
                         <div className="flex flex-col items-center">
                             <img className="h-24 w-24 rounded-full object-cover" src={manager.avatarUrl} alt={manager.name} />
                             <h3 className="mt-2 text-lg font-semibold text-gray-800">{manager.name}</h3>
                             <p className="text-gray-600">{manager.role}</p>
                         </div>
                         <div className="w-px h-8 bg-gray-300 my-2"></div>
                         </>
                    )}
                    <div className="flex flex-col items-center">
                         <img className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-500" src={user.avatarUrl} alt={user.name} />
                         <h3 className="mt-2 text-lg font-semibold text-gray-800">{user.name} (You)</h3>
                         <p className="text-gray-600">{user.role}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Team: {user.team}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {peers.map(member => (
                        <div key={member.id} className="text-center p-4 bg-gray-50 rounded-lg">
                            <img className="h-20 w-20 rounded-full object-cover mx-auto" src={member.avatarUrl} alt={member.name} />
                            <h3 className="mt-4 font-semibold text-gray-800">{member.name}</h3>
                            <p className="text-sm text-gray-500">{member.role}</p>
                            <a href={`mailto:${member.email}`} className="mt-2 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                <Icon name="envelope" className="h-4 w-4 mr-1"/> Email
                            </a>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Employee Directory</h2>
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
