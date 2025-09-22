
import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './common/Icon';
import { Notification } from '../types';

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
    const notificationRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    useEffect(() => {
        if (auth?.user?.id) {
            fetchNotifications();
        }
    }, [auth?.user?.id]);
    
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
    
    if (!auth || !auth.user) {
        return null;
    }

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(true)} className="text-gray-500 focus:outline-none lg:hidden">
                    <Icon name="bars-3" className="h-6 w-6" />
                </button>
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

                <div className="relative">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                            {auth.user.avatarUrl ? (
                                <img className="h-full w-full object-cover" src={auth.user.avatarUrl} alt={auth.user.name} />
                            ) : (
                                <span>{auth.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{auth.user.name}</h2>
                             <p className="text-xs text-gray-500 dark:text-gray-400">{auth.user.role}</p>
                        </div>
                    </div>
                </div>

                <button onClick={auth.logout} className="ml-6 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none">
                     <Icon name="arrow-left-on-rectangle" className="h-6 w-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;
