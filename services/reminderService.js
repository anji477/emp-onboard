// services/reminderService.js
import db from '../db-mysql.js';
import notificationService from './notificationService.js';

class ReminderService {
  async checkDeadlines() {
    try {
      // Check document deadlines
      const [documents] = await db.execute(`
        SELECT ud.user_id, ud.name, ud.due_date, u.name as user_name
        FROM user_documents ud
        JOIN users u ON ud.user_id = u.id
        WHERE ud.status = 'Pending' AND ud.due_date IS NOT NULL
        AND DATEDIFF(ud.due_date, CURDATE()) IN (7, 3, 1)
      `);

      for (const doc of documents) {
        const daysLeft = Math.ceil((new Date(doc.due_date) - new Date()) / (1000 * 60 * 60 * 24));
        await notificationService.notifyDeadlineReminder(doc.user_id, doc.name, daysLeft, 'document');
      }

      // Check overdue documents
      const [overdue] = await db.execute(`
        SELECT ud.user_id, ud.name, u.name as user_name
        FROM user_documents ud
        JOIN users u ON ud.user_id = u.id
        WHERE ud.status = 'Pending' AND ud.due_date < CURDATE()
      `);

      for (const doc of overdue) {
        await notificationService.notifyOverdue(doc.user_id, doc.name, 'document');
      }

      console.log(`✅ Processed ${documents.length} deadline reminders and ${overdue.length} overdue notifications`);
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }

  async checkProgressMilestones() {
    try {
      const [users] = await db.execute(`
        SELECT id, name, onboarding_progress
        FROM users
        WHERE onboarding_progress IN (25, 50, 75, 100)
        AND id NOT IN (
          SELECT user_id FROM notifications 
          WHERE type = 'success' AND related_type = 'progress'
          AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
        )
      `);

      for (const user of users) {
        await notificationService.notifyProgressMilestone(user.id, user.onboarding_progress);
      }

      console.log(`✅ Sent ${users.length} progress milestone notifications`);
    } catch (error) {
      console.error('Error checking progress milestones:', error);
    }
  }

  startScheduler() {
    // Check deadlines every hour
    setInterval(() => {
      this.checkDeadlines();
    }, 60 * 60 * 1000);

    // Check progress milestones every 6 hours
    setInterval(() => {
      this.checkProgressMilestones();
    }, 6 * 60 * 60 * 1000);

    console.log('📅 Reminder scheduler started');
  }
}

export default new ReminderService();