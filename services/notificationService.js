// services/notificationService.js
import db from '../db-mysql.js';

class NotificationService {
  async createNotification(userId, message, type = 'info', relatedId = null, relatedType = null) {
    try {
      await db.execute(
        'INSERT INTO notifications (user_id, message, type, related_id, related_type) VALUES (?, ?, ?, ?, ?)',
        [userId, message, type, relatedId, relatedType]
      );
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async createBulkNotifications(userIds, message, type = 'info') {
    try {
      for (const userId of userIds) {
        await this.createNotification(userId, message, type);
      }
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
    }
  }

  async notifyTaskAssignment(userId, taskTitle, assignedBy) {
    const message = `New task assigned: "${taskTitle}" by ${assignedBy}`;
    await this.createNotification(userId, message, 'task', null, 'task');
  }

  async notifyDocumentStatus(userId, documentName, status, reason = null) {
    let message = `Document "${documentName}" status: ${status}`;
    if (reason && status === 'Rejected') {
      message += ` - ${reason}`;
    }
    await this.createNotification(userId, message, 'document', null, 'document');
  }

  async notifyTrainingAssignment(userId, trainingTitle) {
    const message = `New training module assigned: "${trainingTitle}"`;
    await this.createNotification(userId, message, 'training', null, 'training');
  }

  async notifyDeadlineReminder(userId, itemName, daysLeft, type) {
    const message = `Reminder: "${itemName}" is due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
    await this.createNotification(userId, message, 'reminder', null, type);
  }

  async notifyOverdue(userId, itemName, type) {
    const message = `Overdue: "${itemName}" requires immediate attention`;
    await this.createNotification(userId, message, 'urgent', null, type);
  }

  async notifyWelcome(userId, userName) {
    const message = `Welcome to the team, ${userName}! Complete your onboarding to get started.`;
    await this.createNotification(userId, message, 'welcome', null, 'onboarding');
  }

  async notifyProgressMilestone(userId, progress) {
    const message = `Great progress! You've completed ${progress}% of your onboarding.`;
    await this.createNotification(userId, message, 'success', null, 'progress');
  }

  async notifyNewChatMessage(userId, senderName, conversationId) {
    const message = `New message from ${senderName}`;
    await this.createNotification(userId, message, 'chat', conversationId, 'chat');
  }

  async notifyHRMessage(userId, message, conversationId) {
    await this.createNotification(userId, `HR: ${message}`, 'chat', conversationId, 'hr_chat');
  }
}

export default new NotificationService();