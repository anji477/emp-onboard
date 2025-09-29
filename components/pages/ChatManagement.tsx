// components/pages/ChatManagement.tsx
import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';

interface Conversation {
  id: number;
  user_name: string;
  user_email: string;
  channel_type: string;
  status: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const ChatManagement: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include'
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/chat/hr/conversations', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat/conversation/${conversationId}/messages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Mark messages as read
        await fetch(`/api/chat/conversation/${conversationId}/read`, {
          method: 'PUT',
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch(`/api/chat/conversation/${selectedConversation}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage })
      });

      if (response.ok) {
        const data = await response.json();
        setNewMessage('');
        
        // Add the new message immediately to UI
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        
        // Mark conversation as read
        await fetch(`/api/chat/conversation/${selectedConversation}/read`, {
          method: 'PUT',
          credentials: 'include'
        });
        
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'ai': return <Icon name="sparkles" className="w-4 h-4 text-blue-500" />;
      case 'hr': return <Icon name="users" className="w-4 h-4 text-green-500" />;
      default: return <Icon name="chat-bubble-left-right" className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading conversations...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chat Management</h1>
        <p className="text-gray-600">Manage user conversations and provide support</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Active Conversations</h2>
            <p className="text-sm text-gray-600">{conversations.length} conversations</p>
          </div>
          
          <div className="overflow-y-auto h-[500px]">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => {
                  setSelectedConversation(conversation.id);
                  loadMessages(conversation.id);
                }}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getChannelIcon(conversation.channel_type)}
                      <span className="font-medium text-gray-900">{conversation.user_name}</span>
                      {conversation.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{conversation.user_email}</p>
                    <p className="text-sm text-gray-500 truncate">{conversation.last_message}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {conversation.last_message_time && formatTime(conversation.last_message_time)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {conversations.find(c => c.id === selectedConversation)?.user_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {conversations.find(c => c.id === selectedConversation)?.user_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = currentUser && message.sender_id === currentUser.id;
                  const isHRMessage = ['hr', 'admin'].includes(message.sender_type);
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[70%]">
                        {/* Sender Info */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-2 mb-1 px-1">
                            {message.sender_avatar ? (
                              <img 
                                src={message.sender_avatar} 
                                alt={message.sender_name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {(message.sender_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-xs font-medium text-gray-600">
                              {message.sender_type === 'ai' ? 'Lava AI' : (message.sender_name || 'Unknown User')}
                              {isHRMessage && (
                                <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  {message.sender_type.toUpperCase()}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        
                        {/* Message Bubble */}
                        <div
                          className={`rounded-lg p-3 ${
                            isCurrentUser
                              ? 'bg-blue-600 text-white'
                              : message.sender_type === 'ai'
                              ? 'bg-gray-100 text-gray-800'
                              : isHRMessage
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                          
                          {/* Message Status & Time */}
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${
                              isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                            }`}>
                              {formatTime(message.timestamp)}
                            </p>
                            
                            {isCurrentUser && (
                              <div className="flex items-center gap-1">
                                {message.is_read ? (
                                  <Icon name="check-badge" className="w-3 h-3 text-blue-200" />
                                ) : (
                                  <Icon name="check" className="w-3 h-3 text-blue-300" />
                                )}
                                <span className="text-xs text-blue-200">
                                  {message.is_read ? 'Read' : 'Sent'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Receiver Info for HR messages */}
                        {isCurrentUser && isHRMessage && (
                          <div className="text-xs text-gray-500 mt-1 px-1">
                            To: {conversations.find(c => c.id === selectedConversation)?.user_name || 'User'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type your response..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Icon name="chat-bubble-left-right" className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <Icon name="chat-bubble-left-right" className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total Conversations</p>
              <p className="text-xl font-semibold">{conversations.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <Icon name="clock" className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-gray-600">Pending Responses</p>
              <p className="text-xl font-semibold">
                {conversations.filter(c => c.unread_count > 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <Icon name="sparkles" className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-gray-600">AI Conversations</p>
              <p className="text-xl font-semibold">
                {conversations.filter(c => c.channel_type === 'ai').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <Icon name="users" className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-gray-600">HR Conversations</p>
              <p className="text-xl font-semibold">
                {conversations.filter(c => c.channel_type === 'hr').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatManagement;