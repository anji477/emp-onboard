// fix-ai-knowledge.js
import db from './db-mysql.js';

async function createAIKnowledgeBase() {
  try {
    console.log('Creating AI knowledge base...');

    // Create ai_knowledge_base table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_knowledge_base (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        question_patterns TEXT NOT NULL,
        response_text TEXT NOT NULL,
        confidence_score INT DEFAULT 100,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_active (is_active)
      )
    `);

    // Insert sample knowledge base entries
    const knowledgeEntries = [
      {
        category: 'progress',
        patterns: 'progress|status|how am i doing|my progress|onboarding progress|completion|percentage',
        response: 'Let me check your current onboarding progress, {name}!'
      },
      {
        category: 'documents',
        patterns: 'documents|upload|files|paperwork|forms|what do i need|requirements',
        response: 'Here are your document requirements:'
      },
      {
        category: 'training',
        patterns: 'training|courses|modules|learning|education|study',
        response: 'Let me show you your training status:'
      },
      {
        category: 'policies',
        patterns: 'policies|rules|guidelines|handbook|code of conduct|company policy',
        response: 'Our company policies cover various important topics including code of conduct, leave policies, working hours, benefits, and workplace guidelines. You can find detailed information in the Policies section.'
      },
      {
        category: 'tasks',
        patterns: 'tasks|todo|assignments|work|duties|responsibilities',
        response: 'Here are your current tasks and assignments:'
      },
      {
        category: 'overdue',
        patterns: 'overdue|late|urgent|deadline|due|expired',
        response: 'Let me check for any overdue items:'
      },
      {
        category: 'help',
        patterns: 'help|support|assistance|how to|guide|instructions',
        response: 'I can help you with: \\n• Checking your onboarding progress\\n• Document requirements and uploads\\n• Training modules and completion\\n• Company policies and guidelines\\n• Task assignments and deadlines\\n\\nWhat would you like to know more about?'
      },
      {
        category: 'greeting',
        patterns: 'hello|hi|hey|good morning|good afternoon|good evening|greetings',
        response: 'Hello {name}! How can I assist you with your onboarding today?'
      },
      {
        category: 'team',
        patterns: 'team|colleagues|coworkers|staff|directory|contacts',
        response: 'You can find information about your team members and company directory in the Team section. This includes contact details, roles, and organizational structure.'
      },
      {
        category: 'assets',
        patterns: 'assets|equipment|laptop|computer|hardware|it assets',
        response: 'For IT assets and equipment requests, you can check the Assets section or contact the IT department directly.'
      }
    ];

    for (const entry of knowledgeEntries) {
      await db.execute(
        'INSERT INTO ai_knowledge_base (category, question_patterns, response_text) VALUES (?, ?, ?)',
        [entry.category, entry.patterns, entry.response]
      );
    }

    console.log('✅ AI knowledge base created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating AI knowledge base:', error);
    process.exit(1);
  }
}

createAIKnowledgeBase();