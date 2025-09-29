// components/chat/ChatNotifications.tsx
import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';

interface ChatNotificationsProps {
  user: any;
}

const ChatNotifications: React.FC<ChatNotificationsProps> = ({ user }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user && ['Admin', 'HR'].includes(user.role)) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/chat/unread-count', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/chat/hr/conversations', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        const unreadConversations = data.filter((conv: any) => conv.unread_count > 0);
        setNotifications(unreadConversations);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
  };

  if (!user || !['Admin', 'HR'].includes(user.role)) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={handleNotificationClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <Icon name="bell" className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Chat Notifications</h3>
            <p className="text-sm text-gray-600">{unreadCount} unread messages</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Icon name="chat-bubble-left-right" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No unread messages</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    window.location.href = '/#/chat-management';
                    setShowNotifications(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {notification.user_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {notification.user_name}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {notification.last_message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {notification.last_message_time && 
                            new Date(notification.last_message_time).toLocaleString()}
                        </span>
                        {notification.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {notification.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  window.location.href = '/#/chat-management';
                  setShowNotifications(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Conversations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatNotifications;