// components/chat/ChatWidget.tsx
import React, { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';

interface Message {
  id: number;
  message_text: string;
  sender_type: 'user' | 'ai' | 'hr' | 'admin';
  sender_name?: string;
  timestamp: string;
  metadata?: {
    quickReplies?: Array<{ text: string; value: string }>;
  };
}

interface ChatWidgetProps {
  user: any;
}

interface Conversation {
  id: number;
  user_name: string;
  user_email: string;
  channel_type: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [channelType, setChannelType] = useState<'ai' | 'hr' | 'admin' | 'support'>('ai');
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages when conversation is active
  useEffect(() => {
    if (conversationId && isOpen) {
      const interval = setInterval(() => {
        loadMessages(conversationId, true); // Silent refresh
      }, 3000); // Refresh every 3 seconds
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [conversationId, isOpen]);

  // Auto-refresh HR conversations list
  useEffect(() => {
    if (showConversationList && isOpen && (user?.role === 'HR' || user?.role === 'Admin')) {
      const interval = setInterval(() => {
        loadHRConversations();
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [showConversationList, isOpen, user?.role]);

  useEffect(() => {
    if (isOpen && !conversationId) {
      if (channelType === 'hr' && (user?.role === 'HR' || user?.role === 'Admin')) {
        loadHRConversations();
      } else {
        initializeConversation();
      }
    }
  }, [isOpen, channelType]);

  // Reset conversation when channel changes
  useEffect(() => {
    if (conversationId) {
      setConversationId(null);
      setMessages([]);
    }
    if (channelType === 'hr' && (user?.role === 'HR' || user?.role === 'Admin')) {
      setShowConversationList(true);
    } else {
      setShowConversationList(false);
    }
  }, [channelType]);

  const initializeConversation = async () => {
    try {
      console.log('Initializing conversation for channel:', channelType);
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      
      const response = await fetch('/api/chat/conversation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ channelType })
      });
      
      console.log('Conversation response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Conversation created:', data);
        setConversationId(data.conversationId);
        loadMessages(data.conversationId);
      } else {
        const errorText = await response.text();
        console.error('Failed to create conversation:', response.status, errorText);
        // Show error message to user
        const errorMessage: Message = {
          id: Date.now(),
          message_text: `Error: Unable to start conversation (${response.status}). Please make sure you're logged in and the server is running.`,
          sender_type: 'ai',
          timestamp: new Date().toISOString()
        };
        setMessages([errorMessage]);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    }
  };

  const loadMessages = async (convId: number, silent = false) => {
    try {
      const response = await fetch(`/api/chat/conversation/${convId}/messages`, {
        credentials: 'include'
      });
      if (response.ok) {
        const newMessages = await response.json();
        setMessages(prevMessages => {
          // Only update if messages have actually changed
          if (JSON.stringify(prevMessages) !== JSON.stringify(newMessages)) {
            return newMessages;
          }
          return prevMessages;
        });
      }
    } catch (error) {
      if (!silent) {
        console.error('Error loading messages:', error);
      }
    }
  };

  const sendMessage = async (messageText?: string) => {
    // Clear polling temporarily to avoid conflicts
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    const text = messageText || inputMessage.trim();
    console.log('Sending message:', text, 'ConversationId:', conversationId);
    
    if (!text) {
      console.log('No message text provided');
      return;
    }
    
    // If no conversation ID, initialize first
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      console.log('No conversation ID, initializing...');
      try {
        // Get CSRF token
        const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
        const csrfData = await csrfResponse.json();
        
        const response = await fetch('/api/chat/conversation', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfData.csrfToken
          },
          credentials: 'include',
          body: JSON.stringify({ channelType })
        });
        
        if (response.ok) {
          const data = await response.json();
          currentConversationId = data.conversationId;
          setConversationId(currentConversationId);
          console.log('Conversation initialized:', currentConversationId);
        } else {
          console.error('Failed to initialize conversation');
          return;
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        return;
      }
    }

    setIsLoading(true);
    setInputMessage('');

    // Create temporary message ID
    const tempMessageId = Date.now() + Math.random();
    const userMessage: Message = {
      id: tempMessageId,
      message_text: text,
      sender_type: 'user',
      sender_name: user?.name || 'You',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const csrfData = await csrfResponse.json();
      
      const response = await fetch(`/api/chat/conversation/${currentConversationId}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ message: text })
      });

      console.log('Send message response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Message response:', data);
        
        // Replace temporary message with server response
        if (data.message) {
          setMessages(prev => {
            const updated = prev.map(msg => 
              msg.id === tempMessageId ? { ...data.message, id: data.message.id || tempMessageId } : msg
            );
            return updated;
          });
        }
        
        // Add AI response if present
        if (data.aiResponse) {
          setMessages(prev => [...prev, data.aiResponse]);
        }
        
        // Restart polling after successful send
        if (currentConversationId) {
          const interval = setInterval(() => {
            loadMessages(currentConversationId, true);
          }, 3000);
          setPollingInterval(interval);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to send message:', response.status, errorText);
        
        // Remove the temporary message and show error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
        
        const errorMessage: Message = {
          id: Date.now() + Math.random(),
          message_text: `Error: Message failed to send (${response.status}). Please try again.`,
          sender_type: 'ai',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove the temporary message and show error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      
      const errorMessage: Message = {
        id: Date.now() + Math.random(),
        message_text: 'Error: Network error. Please check your connection and try again.',
        sender_type: 'ai',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHRConversations = async () => {
    try {
      const response = await fetch('/api/chat/hr/conversations', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading HR conversations:', error);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setConversationId(conversation.id);
    setShowConversationList(false);
    loadMessages(conversation.id);
    
    // Mark messages as read when HR opens conversation
    if (user?.role === 'HR' || user?.role === 'Admin') {
      try {
        await fetch(`/api/chat/conversation/${conversation.id}/read`, {
          method: 'PUT',
          credentials: 'include'
        });
        // Refresh conversation list to update unread counts
        loadHRConversations();
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const handleChannelChange = (newChannel: typeof channelType) => {
    // Clear polling when changing channels
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    setChannelType(newChannel);
    setConversationId(null);
    setMessages([]);
    setShowChannelSelector(false);
    setShowConversationList(false);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const getChannelIcon = () => {
    switch (channelType) {
      case 'ai': return <Icon name="sparkles" className="w-4 h-4" />;
      case 'hr': return <Icon name="users" className="w-4 h-4" />;
      case 'admin': return <Icon name="cog-6-tooth" className="w-4 h-4" />;
      default: return <Icon name="chat-bubble-left-right" className="w-4 h-4" />;
    }
  };

  const getChannelName = () => {
    switch (channelType) {
      case 'ai': return 'Lava AI';
      case 'hr': return 'HR Team';
      case 'admin': return 'Admin';
      default: return 'Chat';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Options Menu */}
        <div className={`absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border border-gray-200 p-2 space-y-2 transition-all duration-300 ${showChannelSelector ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-2'}`}>
          <button
            onClick={() => {
              setChannelType('ai');
              setShowChannelSelector(false);
              setIsOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-full">
              <Icon name="sparkles" className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 text-sm">Lava AI</div>
              <div className="text-xs text-gray-500">Instant AI assistance</div>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-auto"></div>
          </button>
          
          <button
            onClick={() => {
              setChannelType('hr');
              setShowChannelSelector(false);
              setIsOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors group"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-full">
              <Icon name="users" className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <div className="font-medium text-gray-900 text-sm">HR Team</div>
              <div className="text-xs text-gray-500">Human support</div>
            </div>
          </button>
        </div>
        
        {/* Main Chat Button */}
        <button
          onClick={() => setShowChannelSelector(!showChannelSelector)}
          className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 ${showChannelSelector ? 'rotate-45' : 'rotate-0'}`}
        >
          <Icon name={showChannelSelector ? "x-mark" : "chat-bubble-left-right"} className="w-6 h-6" />
        </button>
        
        {/* Backdrop */}
        {showChannelSelector && (
          <div 
            className="fixed inset-0 -z-10" 
            onClick={() => setShowChannelSelector(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
      <div className="bg-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getChannelIcon()}
          <div>
            <h3 className="font-semibold">{getChannelName()}</h3>
            <p className="text-xs text-indigo-200">
              {channelType === 'ai' ? 'AI Assistant' : 'Live Chat'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChannelSelector(!showChannelSelector)}
            className="p-1 hover:bg-indigo-700 rounded"
          >
            <Icon name="cog-6-tooth" className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-indigo-700 rounded"
          >
            <Icon name="x-mark" className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showChannelSelector && (
        <div className="bg-gray-50 border-b p-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleChannelChange('ai')}
              className={`p-2 rounded text-sm flex items-center gap-2 ${
                channelType === 'ai' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
              }`}
            >
              <Icon name="sparkles" className="w-4 h-4" />
              Lava AI
            </button>
            <button
              onClick={() => handleChannelChange('hr')}
              className={`p-2 rounded text-sm flex items-center gap-2 ${
                channelType === 'hr' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'
              }`}
            >
              <Icon name="users" className="w-4 h-4" />
              HR Team
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showConversationList ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">HR Conversations</h3>
              <button
                onClick={() => loadHRConversations()}
                className="text-indigo-600 hover:text-indigo-700"
              >
                <Icon name="arrow-path" className="w-4 h-4" />
              </button>
            </div>
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                  conversation.unread_count > 0 ? 'border-indigo-500 bg-indigo-100 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{conversation.user_name}</span>
                      {conversation.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{conversation.user_email}</p>
                    <p className="text-sm text-gray-500 truncate">{conversation.last_message}</p>
                  </div>
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Icon name="chat-bubble-left-right" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No conversations yet</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 py-8">
                <Icon name="sparkles" className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>Start a conversation with Lava!</p>
                <p className="text-xs mt-1">ConversationId: {conversationId || 'Not initialized'}</p>
              </div>
            )}
            {messages.map((message) => {
              const isCurrentUser = user && message.sender_id === user.id;
              const isHRMessage = ['hr', 'admin'].includes(message.sender_type);
              
              return (
                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className="max-w-[80%]">
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
                          {message.sender_type === 'ai' ? 'Lava AI' : (message.sender_name || 'User')}
                          {isHRMessage && (
                            <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              {message.sender_type.toUpperCase()}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`rounded-lg p-3 ${
                      isCurrentUser
                        ? 'bg-indigo-600 text-white'
                        : message.sender_type === 'ai'
                        ? 'bg-gray-100 text-gray-800'
                        : isHRMessage
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                      
                      {/* Message Time */}
                      <div className="mt-2">
                        <p className={`text-xs ${
                          isCurrentUser ? 'text-indigo-200' : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {message.metadata?.quickReplies && (
                        <div className="mt-3 space-y-1">
                          {message.metadata.quickReplies.map((reply, index) => (
                            <button
                              key={index}
                              onClick={() => sendMessage(reply.value)}
                              className="block w-full text-left p-2 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-700"
                            >
                              {reply.text}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-gray-600">Typing...</span>
                  </div>
                </div>
              </div>
            )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span className="text-sm text-gray-600">Lava is typing...</span>
              </div>
            </div>
          </div>
        )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {!showConversationList && (
        <div className="border-t p-4">
          {conversationId && channelType === 'hr' && (user?.role === 'HR' || user?.role === 'Admin') && (
            <button
              onClick={() => {
                // Clear polling when going back to conversation list
                if (pollingInterval) {
                  clearInterval(pollingInterval);
                  setPollingInterval(null);
                }
                setShowConversationList(true);
                setConversationId(null);
                setMessages([]);
              }}
              className="mb-2 text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
            >
              <Icon name="list-bullet" className="w-4 h-4" />
              Back to conversations
            </button>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors"
            >
              <Icon name="arrow-up-tray" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;