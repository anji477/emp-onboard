// routes/chat.js
import express from 'express';
import { verifyToken, requireRole } from '../middleware/auth.js';
import aiService from '../services/aiService.js';
import db from '../db-mysql.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Get or create conversation
router.post('/conversation', verifyToken, async (req, res) => {
  // CSRF protection
  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken) {
    return res.status(403).json({ error: 'CSRF token required' });
  }
  try {
    const { channelType = 'ai' } = req.body;
    const userId = req.user.id;

    // Check for existing active conversation
    const [existing] = await db.execute(
      'SELECT id FROM chat_conversations WHERE user_id = ? AND channel_type = ? AND status = "active" ORDER BY updated_at DESC LIMIT 1',
      [userId, channelType]
    );

    let conversationId;
    
    if (existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      // Create new conversation
      const [result] = await db.execute(
        'INSERT INTO chat_conversations (user_id, channel_type, title) VALUES (?, ?, ?)',
        [userId, channelType, `${channelType.toUpperCase()} Chat - ${new Date().toLocaleDateString()}`]
      );
      conversationId = result.insertId;

      // Send welcome message for AI chat
      if (channelType === 'ai') {
        const userContext = await aiService.getUserContext(userId);
        const greeting = aiService.getGreeting(userContext);
        const quickReplies = await aiService.getQuickReplies(userContext);
        
        await db.execute(
          'INSERT INTO chat_messages (conversation_id, sender_type, message_text, metadata) VALUES (?, ?, ?, ?)',
          [conversationId, 'ai', greeting, JSON.stringify({ quickReplies })]
        );
      } else if (['hr', 'admin', 'support'].includes(channelType)) {
        // Send welcome message for HR channels
        const welcomeMessage = `Hello! You've connected to our ${channelType.toUpperCase()} team. How can we help you today?`;
        await db.execute(
          'INSERT INTO chat_messages (conversation_id, sender_type, message_text) VALUES (?, ?, ?)',
          [conversationId, channelType === 'admin' ? 'admin' : 'hr', welcomeMessage]
        );
      }
    }

    res.json({ conversationId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get conversation messages
router.get('/conversation/:id/messages', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user owns this conversation or is HR/Admin
    const [conversation] = await db.execute(
      'SELECT user_id, channel_type FROM chat_conversations WHERE id = ?',
      [id]
    );

    if (!conversation.length || 
        (conversation[0].user_id !== userId && !['Admin', 'HR'].includes(req.user.role))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter out AI messages for HR channels when viewed by HR/Admin
    let messageQuery = `SELECT cm.*, u.name as sender_name, u.avatar_url as sender_avatar
                        FROM chat_messages cm
                        LEFT JOIN users u ON cm.sender_id = u.id
                        WHERE cm.conversation_id = ?`;
    
    if (['Admin', 'HR'].includes(req.user.role) && 
        ['hr', 'admin', 'support'].includes(conversation[0].channel_type)) {
      messageQuery += ` AND cm.sender_type != 'ai'`;
    }
    
    messageQuery += ` ORDER BY cm.timestamp ASC`;

    const [messages] = await db.execute(messageQuery, [id]);

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/conversation/:id/message', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType = 'text' } = req.body;
    const userId = req.user.id;

    // Validate message
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: 'Message too long (max 4000 characters)' });
    }

    // Verify conversation access
    const [conversation] = await db.execute(
      'SELECT user_id, channel_type FROM chat_conversations WHERE id = ?',
      [id]
    );

    if (!conversation.length || 
        (conversation[0].user_id !== userId && !['Admin', 'HR'].includes(req.user.role))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine sender type
    let senderType = 'user';
    if (['Admin', 'HR'].includes(req.user.role) && conversation[0].user_id !== userId) {
      senderType = req.user.role.toLowerCase();
    }

    // Insert message with proper sender info
    const [userMessage] = await db.execute(
      'INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message_text, message_type, message_status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, senderType, userId, message.trim(), messageType, 'sent']
    );

    // Update conversation timestamp and HR read status
    if (senderType === 'hr') {
      await db.execute(
        'UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP, last_hr_read = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    } else {
      await db.execute(
        'UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    }

    // Create notification for the other party
    if (senderType === 'user') {
      // For user messages, notify all HR/Admin users
      const [hrUsers] = await db.execute(
        'SELECT id FROM users WHERE role IN ("HR", "Admin") AND id != ?',
        [userId]
      );
      for (const hrUser of hrUsers) {
        await db.execute(
          'INSERT INTO chat_notifications (user_id, conversation_id, message_id, notification_type) VALUES (?, ?, ?, ?)',
          [hrUser.id, id, userMessage.insertId, 'new_message']
        );
        // Send system notification
        await notificationService.notifyNewChatMessage(hrUser.id, req.user.name, id);
      }
    } else if (senderType === 'hr' || senderType === 'admin') {
      // For HR/Admin messages, notify the conversation owner
      if (conversation[0].user_id !== userId) {
        await db.execute(
          'INSERT INTO chat_notifications (user_id, conversation_id, message_id, notification_type) VALUES (?, ?, ?, ?)',
          [conversation[0].user_id, id, userMessage.insertId, 'new_message']
        );
        // Send system notification
        await notificationService.notifyHRMessage(conversation[0].user_id, message.trim(), id);
      }
    }

    let aiResponse = null;

    // Generate AI response for AI channel
    if (conversation[0].channel_type === 'ai') {
      try {
        const responseText = await aiService.processMessage(userId, message);
        const userContext = await aiService.getUserContext(userId);
        const quickReplies = await aiService.getQuickReplies(userContext);
        
        const [aiMessage] = await db.execute(
          'INSERT INTO chat_messages (conversation_id, sender_type, message_text, metadata) VALUES (?, ?, ?, ?)',
          [id, 'ai', responseText, JSON.stringify({ quickReplies })]
        );

        aiResponse = {
          id: aiMessage.insertId,
          message_text: responseText,
          sender_type: 'ai',
          timestamp: new Date(),
          metadata: { quickReplies }
        };
      } catch (aiError) {
        console.error('AI response error:', aiError);
        // Send fallback response
        const fallback = "I'm having trouble processing your request. Please try again or contact HR directly.";
        await db.execute(
          'INSERT INTO chat_messages (conversation_id, sender_type, message_text) VALUES (?, ?, ?)',
          [id, 'ai', fallback]
        );
      }
    }

    // Get the complete message with sender info for response
    const [messageDetails] = await db.execute(
      `SELECT cm.*, u.name as sender_name, u.avatar_url as sender_avatar, u.role as sender_role
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_id = u.id
       WHERE cm.id = ?`,
      [userMessage.insertId]
    );

    res.json({ 
      messageId: userMessage.insertId,
      message: messageDetails[0],
      aiResponse 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get user conversations
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [conversations] = await db.execute(
      `SELECT cc.*, 
              (SELECT message_text FROM chat_messages WHERE conversation_id = cc.id ORDER BY timestamp DESC LIMIT 1) as last_message,
              (SELECT timestamp FROM chat_messages WHERE conversation_id = cc.id ORDER BY timestamp DESC LIMIT 1) as last_message_time
       FROM chat_conversations cc
       WHERE cc.user_id = ?
       ORDER BY cc.updated_at DESC`,
      [userId]
    );

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// HR: Get all active conversations
router.get('/hr/conversations', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const [conversations] = await db.execute(
      `SELECT cc.*, u.name as user_name, u.email as user_email,
              (SELECT message_text FROM chat_messages WHERE conversation_id = cc.id AND sender_type != 'ai' ORDER BY timestamp DESC LIMIT 1) as last_message,
              (SELECT timestamp FROM chat_messages WHERE conversation_id = cc.id AND sender_type != 'ai' ORDER BY timestamp DESC LIMIT 1) as last_message_time,
              (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id AND sender_type = 'user' AND timestamp > COALESCE(cc.last_hr_read, '1970-01-01')) as unread_count,
              (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id AND sender_type != 'ai') as total_messages
       FROM chat_conversations cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.status = 'active' AND cc.channel_type IN ('hr', 'admin', 'support') AND cc.channel_type NOT LIKE '%ai%'
       ORDER BY cc.updated_at DESC`
    );

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching HR conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Update chat settings
router.put('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { aiEnabled, notificationsEnabled, preferredChannel } = req.body;

    await db.execute(
      `INSERT INTO chat_settings (user_id, ai_enabled, notifications_enabled, preferred_channel) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       ai_enabled = VALUES(ai_enabled), 
       notifications_enabled = VALUES(notifications_enabled), 
       preferred_channel = VALUES(preferred_channel)`,
      [userId, aiEnabled, notificationsEnabled, preferredChannel]
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating chat settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get chat settings
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [settings] = await db.execute(
      'SELECT * FROM chat_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Return default settings
      res.json({
        aiEnabled: true,
        notificationsEnabled: true,
        preferredChannel: 'ai'
      });
    } else {
      res.json(settings[0]);
    }
  } catch (error) {
    console.error('Error fetching chat settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Mark messages as read
router.put('/conversation/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Update message read status
    await db.execute(
      'UPDATE chat_messages SET is_read = TRUE, read_at = CURRENT_TIMESTAMP, read_by = ? WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [userId, id, userId]
    );
    
    // Update HR read timestamp if HR user
    if (['Admin', 'HR'].includes(req.user.role)) {
      await db.execute(
        'UPDATE chat_conversations SET last_hr_read = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    }
    
    // Mark notifications as read
    await db.execute(
      'UPDATE chat_notifications SET is_read = TRUE WHERE user_id = ? AND conversation_id = ?',
      [userId, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get unread message count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [count] = await db.execute(
      'SELECT COUNT(*) as unread_count FROM chat_notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    
    res.json({ unreadCount: count[0].unread_count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Assign HR to conversation
router.put('/conversation/:id/assign', verifyToken, requireRole(['Admin', 'HR']), async (req, res) => {
  try {
    const { id } = req.params;
    const { hrUserId } = req.body;
    
    await db.execute(
      'UPDATE chat_conversations SET assigned_hr_id = ? WHERE id = ?',
      [hrUserId, id]
    );
    
    // Create notification
    const [conversation] = await db.execute(
      'SELECT user_id FROM chat_conversations WHERE id = ?',
      [id]
    );
    
    if (conversation.length > 0) {
      await db.execute(
        'INSERT INTO chat_notifications (user_id, conversation_id, message_id, notification_type) VALUES (?, ?, 0, ?)',
        [conversation[0].user_id, id, 'hr_assigned']
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning HR:', error);
    res.status(500).json({ error: 'Failed to assign HR' });
  }
});

// Cleanup AI messages from HR conversations
router.delete('/cleanup-ai-messages', verifyToken, requireRole(['Admin']), async (req, res) => {
  try {
    // Delete AI messages from HR/admin/support conversations
    await db.execute(
      `DELETE cm FROM chat_messages cm 
       JOIN chat_conversations cc ON cm.conversation_id = cc.id 
       WHERE cc.channel_type IN ('hr', 'admin', 'support') AND cm.sender_type = 'ai'`
    );
    
    // Update conversations to remove AI channel types that shouldn't be there
    await db.execute(
      `UPDATE chat_conversations SET channel_type = 'hr' WHERE channel_type = 'ai' AND id IN (
        SELECT DISTINCT conversation_id FROM chat_messages WHERE sender_type IN ('hr', 'admin', 'user')
      )`
    );
    
    res.json({ success: true, message: 'AI messages cleaned from HR conversations' });
  } catch (error) {
    console.error('Error cleaning AI messages:', error);
    res.status(500).json({ error: 'Failed to cleanup AI messages' });
  }
});

export default router;