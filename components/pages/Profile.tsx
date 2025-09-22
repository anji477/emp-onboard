import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../../App';
import Card from '../common/Card';
import Button from '../common/Button';
import Icon from '../common/Icon';

const Profile: React.FC = () => {
    const auth = useContext(UserContext);
    
    // Profile form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [profileMessage, setProfileMessage] = useState('');
    const [profileMessageType, setProfileMessageType] = useState<'success' | 'error' | null>(null);

    // Password change form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error' | null>(null);
    
    useEffect(() => {
        if (auth?.user) {
            setName(auth.user.name);
            setEmail(auth.user.email);
            setAvatarUrl(auth.user.avatarUrl || '');
        }
    }, [auth?.user]);

    if (!auth || !auth.user) {
        return null;
    }

    const { user } = auth;

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.user) return;
        
        try {
            // Use user ID 2 for employee (matching database)
            const userId = auth.user.role === 'Admin' ? 1 : 2;
            console.log('Updating profile for user ID:', userId);
            
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, avatar_url: avatarUrl })
            });
            
            if (response.ok) {
                const updatedUserData = await response.json();
                console.log('Profile updated successfully:', updatedUserData);
                
                // Update the user context immediately for UI refresh
                if (auth?.updateUser) {
                    auth.updateUser({
                        name: updatedUserData.name,
                        email: updatedUserData.email,
                        avatarUrl: updatedUserData.avatar_url
                    });
                }
                
                setProfileMessage('Profile updated successfully!');
                setProfileMessageType('success');
                setTimeout(() => setProfileMessage(''), 3000);
            } else {
                const errorData = await response.json();
                console.error('Profile update failed:', errorData);
                setProfileMessage(`Error updating profile: ${errorData.message}`);
                setProfileMessageType('error');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setProfileMessage('Error updating profile. Please try again.');
            setProfileMessageType('error');
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.user) return;
        
        setPasswordMessage('');
        setPasswordMessageType(null);

        if (!newPassword || !confirmPassword) {
            setPasswordMessage('Please fill in the new password fields.');
            setPasswordMessageType('error');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage('New passwords do not match.');
            setPasswordMessageType('error');
            return;
        }

        try {
            const userId = auth.user.role === 'Admin' ? 1 : 6;
            const response = await fetch(`/api/users/${userId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            
            if (response.ok) {
                setPasswordMessage('Password updated successfully!');
                setPasswordMessageType('success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => setPasswordMessage(''), 3000);
            } else {
                setPasswordMessage('Error updating password.');
                setPasswordMessageType('error');
            }
        } catch (error) {
            setPasswordMessage('Error updating password.');
            setPasswordMessageType('error');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Profile & Settings</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your personal information and application preferences.</p>
            </div>

            <Card>
                <div className="flex flex-col items-center md:flex-row md:items-start md:space-x-8 p-4">
                    <div className="flex-shrink-0 mb-6 md:mb-0">
                        <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {avatarUrl ? (
                                <img className="h-full w-full object-cover" src={avatarUrl} alt={user.name} />
                            ) : (
                                <div className="h-full w-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-2xl">
                                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                        setAvatarUrl(event.target?.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                            className="hidden" 
                            id="photo-upload" 
                        />
                        <label 
                            htmlFor="photo-upload" 
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 w-full cursor-pointer block text-center"
                        >
                            Change Photo
                        </label>
                    </div>
                    <div className="w-full">
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Personal Details</h2>
                        <form className="space-y-6" onSubmit={handleProfileUpdate}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                    <input type="text" defaultValue={user.role} disabled className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm" />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Team</label>
                                    <input type="text" defaultValue={user.team} disabled className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 sm:text-sm" />
                                </div>
                            </div>
                            {profileMessage && (
                                <div className={`text-sm ${profileMessageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {profileMessage}
                                </div>
                            )}
                             <div className="text-right">
                                 <Button type="submit">Save Changes</Button>
                             </div>
                        </form>
                    </div>
                </div>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Change Password</h2>
                    <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                            <input 
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                             <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                        </div>
                        {passwordMessage && (
                            <div className={`text-sm ${passwordMessageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {passwordMessage}
                            </div>
                        )}
                        <div className="text-right">
                             <Button type="submit">Update Password</Button>
                         </div>
                    </form>
                </Card>
                <Card>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Notification Preferences</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Email Notifications</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                         <div className="flex items-center justify-between">
                            <span className="text-gray-700 dark:text-gray-300">Push Notifications</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Profile;