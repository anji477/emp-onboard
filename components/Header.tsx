
import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './common/Icon';
import Loader from './common/Loader';
import { Notification, UserRole } from '../types';

interface CompanySettings {
    name: string;
    logo: string;
    primaryColor: string;
}

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
    const auth = useContext(UserContext);
    const navigate = useNavigate();
    const { darkMode, toggleDarkMode } = useTheme();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordPolicy, setPasswordPolicy] = useState({ minLength: 8, requireUppercase: true, requireNumbers: true, requireSymbols: true });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [companySettings, setCompanySettings] = useState<CompanySettings>({ name: 'Onboardly', logo: '', primaryColor: '#6366f1' });
    const notificationRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    useEffect(() => {
        if (auth?.user?.id) {
            fetchNotifications();
            fetchPasswordPolicy();
            fetchCompanySettings();
        }
    }, [auth?.user?.id]);
    
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
    
    const fetchCompanySettings = async () => {
        try {
            const response = await fetch('/api/settings', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                const company = data.company_info?.value || { name: 'Onboardly', logo: '', primaryColor: '#6366f1' };
                setCompanySettings(company);
            }
        } catch (error) {
            console.error('Error fetching company settings:', error);
        }
    };
    
    const fetchNotifications = async () => {
        try {
            const response = await fetch(`/api/notifications/${auth?.user?.id}`);
            if (response.ok) {
                const data = await response.json();
                const formattedNotifications = data.map((n: any) => ({
                    id: n.id.toString(),
                    message: n.message,
                    timestamp: formatTimestamp(n.created_at),
                    read: n.is_read,
                    is_read: n.is_read
                }));
                setNotifications(formattedNotifications);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };
    
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    const handleSearch = async (query: string) => {
        if (query.length < 2) {
            setSearchResults(null);
            setIsSearchOpen(false);
            return;
        }
        
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const results = await response.json();
                setSearchResults(results);
                setIsSearchOpen(true);
            } else {
                setSearchResults({ policies: [], users: [], tasks: [] });
                setIsSearchOpen(true);
            }
        } catch (error) {
            setSearchResults({ policies: [], users: [], tasks: [] });
            setIsSearchOpen(true);
        }
    };

    const handleResultClick = (type: string, item: any) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        setSearchResults(null);
        
        setTimeout(() => {
            if (type === 'policy') {
                navigate(`/policies?id=${item.id}`);
            } else if (type === 'user') {
                navigate('/team');
            } else if (type === 'task') {
                navigate('/tasks');
            }
        }, 100);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMarkAsRead = async (id: string) => {
        try {
            const response = await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT'
            });
            if (response.ok) {
                setNotifications(notifications.map(n => 
                    n.id === id ? { ...n, read: true, is_read: true } : n
                ));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const response = await fetch(`/api/notifications/user/${auth?.user?.id}/read-all`, {
                method: 'PUT'
            });
            if (response.ok) {
                setNotifications(notifications.map(n => ({ ...n, read: true, is_read: true })));
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const switchRole = async (newRole: UserRole) => {
        try {
            const response = await fetch(`/api/users/${auth.user.id}/switch-role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: newRole })
            });

            if (response.ok) {
                window.location.href = '/';
            } else {
                const error = await response.json();
                console.error('Switch role failed:', error.message);
            }
        } catch (error) {
            console.error('Error switching role:', error);
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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!passwordData.currentPassword) {
            setPasswordError('Current password is required');
            return;
        }

        const passwordErrors = validatePassword(passwordData.newPassword);
        if (passwordErrors.length > 0) {
            setPasswordError(`Password must contain ${passwordErrors.join(', ')}`);
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordData.currentPassword === passwordData.newPassword) {
            setPasswordError('New password must be different from current password');
            return;
        }

        try {
            setChangingPassword(true);
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            if (response.ok) {
                setPasswordSuccess('Password changed successfully!');
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => {
                    setIsChangePasswordOpen(false);
                    setPasswordSuccess('');
                }, 2000);
            } else {
                const error = await response.json();
                setPasswordError(error.message || 'Failed to change password');
            }
        } catch (error) {
            setPasswordError('An error occurred while changing password');
        } finally {
            setChangingPassword(false);
        }
    };
    
    if (!auth || !auth.user) {
        return null;
    }

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(true)} className="text-gray-500 focus:outline-none lg:hidden">
                    <Icon name="bars-3" className="h-6 w-6" />
                </button>
                
                <div className="hidden lg:flex items-center ml-4">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">MD</span>
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">MyDigitalAccounts</span>
                    </div>
                </div>
                <div className="relative mx-4 lg:mx-0" ref={searchRef}>
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                         <Icon name="magnifying-glass" className="h-5 w-5 text-gray-500" />
                    </span>
                    <input 
                        className="w-32 pl-10 pr-4 rounded-md form-input sm:w-64 focus:border-indigo-600 dark:bg-gray-700 dark:text-white dark:border-gray-600" 
                        type="text" 
                        placeholder="Search" 
                        value={searchQuery}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearchQuery(value);
                            if (value.length >= 2) {
                                handleSearch(value);
                            } else {
                                setIsSearchOpen(false);
                                setSearchResults(null);
                            }
                        }}
                        onFocus={() => setIsSearchOpen(true)}
                    />
                    
                    {isSearchOpen && searchQuery.length > 1 && searchResults && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-600 z-20 max-h-96 overflow-y-auto">
                            {searchResults.policies && searchResults.policies.length > 0 && (
                                <div className="p-2">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Policies</h4>
                                    {searchResults.policies.map((policy: any) => (
                                        <div key={policy.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => handleResultClick('policy', policy)}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{policy.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{policy.category}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {searchResults.users && searchResults.users.length > 0 && (
                                <div className="p-2 border-t dark:border-gray-600">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Users</h4>
                                    {searchResults.users.map((user: any) => (
                                        <div key={user.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => handleResultClick('user', user)}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.role} - {user.team}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {searchResults.tasks && searchResults.tasks.length > 0 && (
                                <div className="p-2 border-t dark:border-gray-600">
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Tasks</h4>
                                    {searchResults.tasks.map((task: any) => (
                                        <div key={task.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => handleResultClick('task', task)}>
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{task.category} - {task.status}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {(!searchResults.policies?.length && !searchResults.users?.length && !searchResults.tasks?.length) && (
                                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                    No results found for "{searchQuery}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center">
                {/* Dark Mode Toggle */}
                <button
                    onClick={() => {
                        console.log('Dark mode toggle clicked, current:', darkMode);
                        toggleDarkMode();
                    }}
                    className="flex mx-4 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                    title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {darkMode ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                    )}
                </button>
                
                <div className="relative" ref={notificationRef}>
                    <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="flex mx-4 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none relative">
                        <Icon name="bell" className="h-6 w-6" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-10 border">
                            <div className="p-4 flex justify-between items-center border-b">
                                <h4 className="font-semibold text-gray-800">Notifications</h4>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllAsRead} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map(notification => (
                                        <div 
                                            key={notification.id} 
                                            className={`p-4 border-b border-gray-100 flex items-start gap-3 transition-colors ${!notification.is_read ? 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer' : 'hover:bg-gray-50'}`}
                                            onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            {!notification.is_read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>}
                                            <div className="flex-grow">
                                                <p className="text-sm text-gray-700">{notification.message}</p>
                                                <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No new notifications</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-3 transition-all duration-200 hover:shadow-md group"
                    >
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white dark:ring-gray-800 shadow-lg">
                            {auth.user.avatarUrl ? (
                                <img className="w-10 h-10 object-cover object-center" src={auth.user.avatarUrl} alt={auth.user.name} />
                            ) : (
                                <span className="text-white font-bold text-sm leading-none">{auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                            )}
                        </div>
                        <div className="text-left">
                            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{auth.user.name}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {auth.user.role}
                            </p>
                        </div>
                        <svg className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center space-x-3">
                                    <div className="h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                        {auth.user.avatarUrl ? (
                                            <img className="w-12 h-12 object-cover object-center" src={auth.user.avatarUrl} alt={auth.user.name} />
                                        ) : (
                                            <span className="text-white font-bold text-base leading-none">{auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{auth.user.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{auth.user.email}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="py-2">
                                <button
                                    onClick={() => {
                                        navigate('/profile');
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                                >
                                    <Icon name="user" className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Profile Settings</span>
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setIsChangePasswordOpen(true);
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                                >
                                    <Icon name="key" className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Change Password</span>
                                </button>
                                
                                {(auth.user.availableRoles && auth.user.availableRoles.length > 1) && (
                                    <>
                                        <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>
                                        
                                        <div className="px-4 py-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Switch Role</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => switchRole(UserRole.Admin)}
                                                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                                        auth.user.role === UserRole.Admin 
                                                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                    }`}
                                                >
                                                    Admin
                                                </button>
                                                <button
                                                    onClick={() => switchRole(UserRole.Employee)}
                                                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                                                        auth.user.role === UserRole.Employee 
                                                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                    }`}
                                                >
                                                    Employee
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="border-t border-gray-100 dark:border-gray-700 mt-2"></div>
                                    </>
                                )}
                                
                                <button
                                    onClick={() => {
                                        auth.logout();
                                        setIsProfileDropdownOpen(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors text-red-600 dark:text-red-400"
                                >
                                    <Icon name="arrow-left-on-rectangle" className="h-5 w-5" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={auth.logout} className="ml-6 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none">
                     <Icon name="arrow-left-on-rectangle" className="h-6 w-6" />
                </button>
            </div>

            {/* Change Password Modal */}
            {isChangePasswordOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h3>
                            <button
                                onClick={() => {
                                    setIsChangePasswordOpen(false);
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    setPasswordError('');
                                    setPasswordSuccess('');
                                }}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <Icon name="x-mark" className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? "text" : "password"}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? "text" : "password"}
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                                {passwordData.newPassword && (
                                    <div className="mt-2 text-xs space-y-1">
                                        <div className={`flex items-center ${passwordData.newPassword.length >= passwordPolicy.minLength ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className="mr-1">{passwordData.newPassword.length >= passwordPolicy.minLength ? '✓' : '✗'}</span>
                                            At least {passwordPolicy.minLength} characters
                                        </div>
                                        {passwordPolicy.requireUppercase && (
                                            <div className={`flex items-center ${/[A-Z]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                                <span className="mr-1">{/[A-Z]/.test(passwordData.newPassword) ? '✓' : '✗'}</span>
                                                One uppercase letter
                                            </div>
                                        )}
                                        <div className={`flex items-center ${/[a-z]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className="mr-1">{/[a-z]/.test(passwordData.newPassword) ? '✓' : '✗'}</span>
                                            One lowercase letter
                                        </div>
                                        {passwordPolicy.requireNumbers && (
                                            <div className={`flex items-center ${/\d/.test(passwordData.newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                                <span className="mr-1">{/\d/.test(passwordData.newPassword) ? '✓' : '✗'}</span>
                                                One number
                                            </div>
                                        )}
                                        {passwordPolicy.requireSymbols && (
                                            <div className={`flex items-center ${/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) ? 'text-green-600' : 'text-red-600'}`}>
                                                <span className="mr-1">{/[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword) ? '✓' : '✗'}</span>
                                                One special character
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? "text" : "password"}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                            
                            {passwordError && (
                                <div className="text-red-600 text-sm">{passwordError}</div>
                            )}
                            
                            {passwordSuccess && (
                                <div className="text-green-600 text-sm">{passwordSuccess}</div>
                            )}
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsChangePasswordOpen(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                        setPasswordError('');
                                        setPasswordSuccess('');
                                    }}
                                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {changingPassword ? (
                                        <div className="flex items-center justify-center">
                                            <Loader size="sm" color="white" />
                                            <span className="ml-2">Changing...</span>
                                        </div>
                                    ) : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
