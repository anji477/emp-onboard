// services/aiService.js
import db from '../db-mysql.js';

class AIService {
  constructor() {
    this.name = 'Lava';
    this.personality = 'Professional HR Assistant';
  }

  async processMessage(userId, message) {
    try {
      // Get user context for personalized responses
      const userContext = await this.getUserContext(userId);
      
      // Find matching response from knowledge base
      const response = await this.findBestResponse(message, userContext);
      
      // If no good match, provide fallback response
      if (!response) {
        return this.getFallbackResponse(userContext);
      }
      
      return response;
    } catch (error) {
      console.error('AI Service error:', error);
      return this.getErrorResponse();
    }
  }

  async getUserContext(userId) {
    try {
      // Get user basic info
      const [users] = await db.execute(
        'SELECT id, name, email, role, team, onboarding_progress FROM users WHERE id = ?',
        [userId]
      );
      const user = users[0];

      if (!user) return { user: null, documents: [], training: [], tasks: [], assignments: [], pendingDocuments: 0, completedTraining: 0, totalTraining: 0, pendingTasks: 0, overdueDocuments: 0 };

      // Get user's documents status with detailed info (with fallback)
      let documents = [];
      try {
        const [docs] = await db.execute(
          'SELECT name, status, due_date, category, uploaded_at FROM user_documents WHERE user_id = ?',
          [userId]
        );
        documents = docs;
      } catch (docError) {
        console.log('user_documents table not available:', docError.message);
      }

      // Get user's training progress (with fallback)
      let training = [];
      try {
        const [train] = await db.execute(
          `SELECT tm.title, tm.type, COALESCE(utp.completed, FALSE) as completed
           FROM training_modules tm
           LEFT JOIN user_training_progress utp ON tm.id = utp.module_id AND utp.user_id = ?`,
          [userId]
        );
        training = train;
      } catch (trainError) {
        console.log('training tables not available:', trainError.message);
      }

      // Get user's tasks (with fallback)
      let tasks = [];
      try {
        const [taskList] = await db.execute(
          'SELECT title, status, category, due_date FROM tasks WHERE user_id = ?',
          [userId]
        );
        tasks = taskList;
      } catch (taskError) {
        console.log('tasks table not available:', taskError.message);
      }

      // Get user's assignments (with fallback)
      let assignments = [];
      try {
        const [assign] = await db.execute(
          `SELECT ua.*, 
                  CASE 
                    WHEN ua.item_type = 'task' THEN t.title
                    WHEN ua.item_type = 'training' THEN tm.title
                    WHEN ua.item_type = 'document' THEN ud.name
                  END as item_title
           FROM user_assignments ua
           LEFT JOIN tasks t ON ua.item_type = 'task' AND ua.item_id = t.id
           LEFT JOIN training_modules tm ON ua.item_type = 'training' AND ua.item_id = tm.id
           LEFT JOIN user_documents ud ON ua.item_type = 'document' AND ua.item_id = ud.id
           WHERE ua.user_id = ? AND ua.status != 'completed'`,
          [userId]
        );
        assignments = assign;
      } catch (assignError) {
        console.log('assignments table not available:', assignError.message);
      }

      return {
        user,
        documents,
        training,
        tasks,
        assignments,
        pendingDocuments: documents.filter(d => d.status === 'Pending').length,
        completedTraining: training.filter(t => t.completed).length,
        totalTraining: training.length,
        pendingTasks: tasks.filter(t => t.status !== 'Completed').length,
        overdueDocuments: documents.filter(d => d.due_date && new Date(d.due_date) < new Date() && d.status === 'Pending').length
      };
    } catch (error) {
      console.error('Error getting user context:', error);
      return {
        user: { id: userId, name: 'User', onboarding_progress: 0 },
        documents: [],
        training: [],
        tasks: [],
        assignments: [],
        pendingDocuments: 0,
        completedTraining: 0,
        totalTraining: 0,
        pendingTasks: 0,
        overdueDocuments: 0
      };
    }
  }

  async findBestResponse(message, userContext) {
    try {
      const [responses] = await db.execute(
        'SELECT * FROM ai_knowledge_base WHERE is_active = TRUE ORDER BY confidence_score DESC'
      );

      const messageLower = message.toLowerCase();
      
      for (const response of responses) {
        const patterns = response.question_patterns.toLowerCase().split('|');
        
        if (patterns.some(pattern => messageLower.includes(pattern.trim()))) {
          return this.personalizeResponse(response.response_text, userContext, response.category);
        }
      }
      
      return this.getContextualResponse(messageLower, userContext);
    } catch (error) {
      console.error('Error finding response:', error);
      return this.getContextualResponse(message.toLowerCase(), userContext);
    }
  }

  getContextualResponse(messageLower, userContext) {
    if (messageLower.includes('progress') || messageLower.includes('status')) {
      return this.personalizeResponse('Let me check your current onboarding progress!', userContext, 'progress');
    }
    if (messageLower.includes('document') || messageLower.includes('upload')) {
      return this.personalizeResponse('Here are your document requirements:', userContext, 'documents');
    }
    if (messageLower.includes('training') || messageLower.includes('course')) {
      return this.personalizeResponse('Let me show you your training status:', userContext, 'training');
    }
    if (messageLower.includes('policies') || messageLower.includes('policy')) {
      return 'Our company policies cover code of conduct, leave policy, working hours, and benefits. You can find detailed information in the Policies section.';
    }
    return null;
  }

  personalizeResponse(baseResponse, userContext, category) {
    if (!userContext || !userContext.user) {
      return baseResponse;
    }

    const { user } = userContext;
    let personalizedResponse = baseResponse.replace(/\{name\}/g, user.name);

    // Add personalized context based on category
    switch (category) {
      case 'progress':
        personalizedResponse += `\n\n📊 Your Current Progress:\n`;
        personalizedResponse += `• Overall Progress: ${user.onboarding_progress}%\n`;
        personalizedResponse += `• Pending Documents: ${userContext.pendingDocuments}\n`;
        personalizedResponse += `• Training Completed: ${userContext.completedTraining}/${userContext.totalTraining}\n`;
        personalizedResponse += `• Pending Tasks: ${userContext.pendingTasks}`;
        
        if (userContext.overdueDocuments > 0) {
          personalizedResponse += `\n⚠️ You have ${userContext.overdueDocuments} overdue documents that need immediate attention.`;
        }
        
        // Add specific next steps
        if (userContext.pendingDocuments > 0) {
          const pendingDocs = userContext.documents.filter(d => d.status === 'Pending').slice(0, 3);
          personalizedResponse += `\n\n📋 Next Documents to Upload:\n`;
          pendingDocs.forEach(doc => {
            personalizedResponse += `• ${doc.name}${doc.due_date ? ` (Due: ${new Date(doc.due_date).toLocaleDateString()})` : ''}\n`;
          });
        }
        break;
        
      case 'documents':
        if (userContext.pendingDocuments > 0) {
          personalizedResponse += `\n\n📋 You currently have ${userContext.pendingDocuments} pending documents to upload.`;
        } else {
          personalizedResponse += `\n\n✅ Great! You've uploaded all required documents.`;
        }
        break;
        
      case 'training':
        if (userContext.completedTraining < userContext.totalTraining) {
          personalizedResponse += `\n\n📚 You have ${userContext.totalTraining - userContext.completedTraining} training modules remaining.`;
        } else {
          personalizedResponse += `\n\n🎓 Excellent! You've completed all training modules.`;
        }
        break;
        
      case 'document_status':
        personalizedResponse += `\n\n📋 Document Status Summary:\n`;
        const docsByStatus = userContext.documents.reduce((acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        }, {});
        
        Object.entries(docsByStatus).forEach(([status, count]) => {
          personalizedResponse += `• ${status}: ${count} documents\n`;
        });
        break;
        
      case 'overdue':
        if (userContext.overdueDocuments > 0) {
          personalizedResponse += `\n\n⚠️ Urgent: You have ${userContext.overdueDocuments} overdue documents:\n`;
          const overdueDocs = userContext.documents.filter(d => 
            d.due_date && new Date(d.due_date) < new Date() && d.status === 'Pending'
          );
          overdueDocs.forEach(doc => {
            personalizedResponse += `• ${doc.name} (Due: ${new Date(doc.due_date).toLocaleDateString()})\n`;
          });
        } else {
          personalizedResponse += `\n\n✅ Great! You have no overdue items.`;
        }
        break;
    }

    return personalizedResponse;
  }

  getFallbackResponse(userContext) {
    const responses = [
      `Hi ${userContext?.user?.name || 'there'}! I'm Lava, your HR assistant. I can help you with onboarding, documents, training, policies, and more. What would you like to know?`,
      `I'm here to help! You can ask me about your onboarding progress, required documents, training modules, company policies, or any HR-related questions.`,
      `I didn't quite understand that. Try asking about: onboarding process, document requirements, training courses, company policies, or your progress status.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getErrorResponse() {
    return "I'm experiencing some technical difficulties right now. Please try again in a moment, or contact HR directly if you need immediate assistance.";
  }

  getGreeting(userContext) {
    const timeOfDay = new Date().getHours();
    let greeting = 'Hello';
    
    if (timeOfDay < 12) greeting = 'Good morning';
    else if (timeOfDay < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    const name = userContext?.user?.name || 'there';
    return `${greeting} ${name}! 👋 I'm Lava, your HR assistant. How can I help you today?`;
  }

  async getQuickReplies(userContext) {
    const baseReplies = [
      { text: '📊 My Progress', value: 'show my progress' },
      { text: '📋 Documents', value: 'what documents do I need' },
      { text: '📚 Training', value: 'show my training' },
      { text: '📖 Policies', value: 'company policies' }
    ];

    // Add contextual quick replies based on user status
    if (userContext?.pendingDocuments > 0) {
      baseReplies.unshift({ text: '⚠️ Pending Documents', value: 'show pending documents' });
    }

    if (userContext?.pendingTasks > 0) {
      baseReplies.push({ text: '✅ My Tasks', value: 'show my tasks' });
    }

    return baseReplies;
  }
}

export default new AIService();