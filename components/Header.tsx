
import React, { useContext, useState, useEffect, useRef } from 'react';
import { UserContext } from '../App';
import Icon from './common/Icon';
import { Notification } from '../types';

interface HeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
    const auth = useContext(UserContext);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notificationRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
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
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b-2">
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(true)} className="text-gray-500 focus:outline-none lg:hidden">
                    <Icon name="bars-3" className="h-6 w-6" />
                </button>
                <div className="relative mx-4 lg:mx-0">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                         <Icon name="magnifying-glass" className="h-5 w-5 text-gray-500" />
                    </span>
                    <input className="w-32 pl-10 pr-4 rounded-md form-input sm:w-64 focus:border-indigo-600" type="text" placeholder="Search" />
                </div>
            </div>

            <div className="flex items-center">
                <div className="relative" ref={notificationRef}>
                    <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="flex mx-4 text-gray-600 focus:outline-none relative">
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
                            <h2 className="text-sm font-semibold text-gray-800">{auth.user.name}</h2>
                             <p className="text-xs text-gray-500">{auth.user.role}</p>
                        </div>
                    </div>
                </div>

                <button onClick={auth.logout} className="ml-6 text-gray-600 hover:text-indigo-600 focus:outline-none">
                     <Icon name="arrow-left-on-rectangle" className="h-6 w-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;
