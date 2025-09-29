// setup-chatbot-db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
};

async function setupChatbotDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Create chat_conversations table
    console.log('Creating chat_conversations table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel_type ENUM('ai', 'hr', 'admin', 'support') DEFAULT 'ai',
        status ENUM('active', 'closed', 'waiting') DEFAULT 'active',
        title VARCHAR(255),
        assigned_to INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_channel (channel_type)
      )
    `);
    
    // Create chat_messages table
    console.log('Creating chat_messages table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_type ENUM('user', 'ai', 'hr', 'admin', 'system') NOT NULL,
        sender_id INT NULL,
        message_text TEXT NOT NULL,
        message_type ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
        attachments JSON NULL,
        metadata JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_conversation (conversation_id),
        INDEX idx_timestamp (timestamp)
      )
    `);
    
    // Create ai_knowledge_base table
    console.log('Creating ai_knowledge_base table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_knowledge_base (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        question_patterns TEXT NOT NULL,
        response_text TEXT NOT NULL,
        confidence_score DECIMAL(3,2) DEFAULT 0.80,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);
    
    // Create chat_settings table
    console.log('Creating chat_settings table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_settings (
        user_id INT PRIMARY KEY,
        ai_enabled BOOLEAN DEFAULT TRUE,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        preferred_channel ENUM('ai', 'hr', 'admin', 'support') DEFAULT 'ai',
        language_preference VARCHAR(10) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Insert default knowledge base entries
    console.log('Inserting default knowledge base...');
    const knowledgeBase = [
      ['onboarding', 'how to start|getting started|onboarding process|first day', 'Welcome to the company! Your onboarding process includes: 1) Complete your profile, 2) Upload required documents, 3) Complete training modules, 4) Meet with your manager. You can track your progress in the dashboard.'],
      ['documents', 'what documents|required documents|upload documents|document list', 'You need to upload these documents: ID proof, Address proof, Educational certificates, Previous employment letter, and Bank details. You can upload them in the Documents section.'],
      ['training', 'training modules|courses|learning|training schedule', 'We have various training modules available including company policies, safety training, and role-specific courses. Check the Training section to see your assigned modules.'],
      ['policies', 'company policy|policies|rules|guidelines|handbook', 'Our company policies cover code of conduct, leave policy, working hours, and benefits. You can find all policies in the Policies section of your dashboard.'],
      ['leave', 'leave policy|vacation|sick leave|time off|holidays', 'You are entitled to annual leave, sick leave, and public holidays. Please check with HR for specific leave balances and approval process.'],
      ['contact', 'contact hr|hr contact|help|support|who to contact', 'You can reach HR team through this chat, email hr@company.com, or call the HR helpline. For technical issues, contact IT support.'],
      ['benefits', 'benefits|insurance|perks|health insurance|employee benefits', 'Employee benefits include health insurance, life insurance, retirement plans, and various perks. Details are available in your employee handbook.'],
      ['progress', 'my progress|onboarding status|completion|how am I doing', 'I can see your current onboarding progress. Let me check your status and provide personalized updates based on your completed tasks and pending items.'],
      ['document_status', 'document status|my documents|uploaded documents|document progress', 'Let me check the status of your uploaded documents and any pending requirements.'],
      ['overdue', 'overdue|late|missed deadline|urgent', 'I will help you identify any overdue items that need immediate attention.'],
      ['next_steps', 'what next|next steps|what should I do|what do I need to do', 'Based on your current progress, I can suggest the next steps in your onboarding journey.'],
      ['specific_document', 'upload|document|file|form|certificate', 'I can help you with document upload requirements and guide you through the process.']
    ];
    
    for (const [category, patterns, response] of knowledgeBase) {
      await connection.execute(
        'INSERT IGNORE INTO ai_knowledge_base (category, question_patterns, response_text, created_by) VALUES (?, ?, ?, ?)',
        [category, patterns, response, 1]
      );
    }
    
    console.log('✅ Chatbot database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up chatbot database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

setupChatbotDatabase();