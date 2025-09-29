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
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [passwordPolicy, setPasswordPolicy] = useState({ minLength: 8, requireUppercase: true, requireNumbers: true, requireSymbols: true });
    
    useEffect(() => {
        if (auth?.user) {
            setName(auth.user.name);
            setEmail(auth.user.email);
            setAvatarUrl(auth.user.avatarUrl || '');
            fetchPasswordPolicy();
        }
    }, [auth?.user]);
    
    const fetchPasswordPolicy = async () => {
        try {
            const response = await fetch('/api/settings', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const policy = data.password_policy?.value || { minLength: 8, requireUppercase: true, requireNumbers: true, requireSymbols: true };
                setPasswordPolicy(policy);
            }
        } catch (error) {
            console.error('Error fetching password policy:', error);
        }
    };
    
    const validatePassword = (password: string) => {
        const errors = [];
        if (password.length < passwordPolicy.minLength) errors.push(`at least ${passwordPolicy.minLength} characters`);
        if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) errors.push('one uppercase letter');
        if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
        if (passwordPolicy.requireNumbers && !/\d/.test(password)) errors.push('one number');
        if (passwordPolicy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('one special character');
        
        // Check for compromised passwords
        const compromisedPasswords = [
            'password', 'password123', 'password1', 'password12', 'password1234',
            'admin', 'admin123', 'admin1', 'administrator', 'root', 'root123',
            '123456', '1234567', '12345678', '123456789', '1234567890',
            'qwerty', 'qwerty123', 'qwertyuiop', 'asdfgh', 'zxcvbn',
            'welcome', 'welcome123', 'letmein', 'monkey', 'dragon',
            'abc123', 'abcdef', 'abcd1234', 'test', 'test123',
            'user', 'user123', 'guest', 'guest123', 'demo', 'demo123',
            'login', 'login123', 'pass', 'pass123', 'secret', 'secret123'
        ];
        
        const lowerPassword = password.toLowerCase();
        if (compromisedPasswords.some(weak => lowerPassword === weak || lowerPassword.includes(weak))) {
            errors.push('password is too common and easily compromised');
        }
        
        return errors;
    };

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

        if (!currentPassword) {
            setPasswordMessage('Current password is required');
            setPasswordMessageType('error');
            return;
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            setPasswordMessage(`Password must contain ${passwordErrors.join(', ')}`);
            setPasswordMessageType('error');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordMessage('New passwords do not match.');
            setPasswordMessageType('error');
            return;
        }

        if (currentPassword === newPassword) {
            setPasswordMessage('New password must be different from current password');
            setPasswordMessageType('error');
            return;
        }

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Profile & Settings</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">Manage your personal information and application preferences.</p>
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
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Personal Details</h2>
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
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Change Password</h2>
                    <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                            <div className="relative">
                                <input 
                                    type={showPasswords.current ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="mt-1 block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.current ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.new ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="mt-1 block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.new ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {newPassword && (
                                <div className="mt-2 text-xs space-y-1">
                                    <div className={`flex items-center ${newPassword.length >= passwordPolicy.minLength ? 'text-green-600' : 'text-red-600'}`}>
                                        <span className="mr-1">{newPassword.length >= passwordPolicy.minLength ? '✓' : '✗'}</span>
                                        At least {passwordPolicy.minLength} characters
                                    </div>
                                    {passwordPolicy.requireUppercase && (
                                        <div className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className="mr-1">{/[A-Z]/.test(newPassword) ? '✓' : '✗'}</span>
                                            One uppercase letter
                                        </div>
                                    )}
                                    <div className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                        <span className="mr-1">{/[a-z]/.test(newPassword) ? '✓' : '✗'}</span>
                                        One lowercase letter
                                    </div>
                                    {passwordPolicy.requireNumbers && (
                                        <div className={`flex items-center ${/\d/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className="mr-1">{/\d/.test(newPassword) ? '✓' : '✗'}</span>
                                            One number
                                        </div>
                                    )}
                                    {passwordPolicy.requireSymbols && (
                                        <div className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className="mr-1">{/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '✓' : '✗'}</span>
                                            One special character
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    type={showPasswords.confirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-1 block w-full pr-10 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPasswords.confirm ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
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
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Notification Preferences</h2>
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