import crypto from 'crypto';

class SessionStore {
  constructor(db) {
    this.db = db;
    this.initTable();
  }

  async initTable() {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR(128) PRIMARY KEY,
        user_id INT NULL,
        data JSON NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at)
      )
    `);
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  async create(userId, data, maxAge = 24 * 60 * 60 * 1000) {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date(Date.now() + maxAge);
    
    await this.db.execute(
      'INSERT INTO user_sessions (id, user_id, data, expires_at) VALUES (?, ?, ?, ?)',
      [sessionId, userId, JSON.stringify(data), expiresAt]
    );
    
    return sessionId;
  }

  async get(sessionId) {
    const [sessions] = await this.db.execute(
      'SELECT * FROM user_sessions WHERE id = ? AND expires_at > NOW()',
      [sessionId]
    );
    
    if (sessions.length === 0) return null;
    
    const session = sessions[0];
    return {
      id: session.id,
      userId: session.user_id,
      data: JSON.parse(session.data),
      expiresAt: session.expires_at
    };
  }

  async update(sessionId, data) {
    await this.db.execute(
      'UPDATE user_sessions SET data = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(data), sessionId]
    );
  }

  async destroy(sessionId) {
    await this.db.execute('DELETE FROM user_sessions WHERE id = ?', [sessionId]);
  }

  async destroyAllForUser(userId) {
    await this.db.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
  }

  async regenerate(oldSessionId, userId, data, maxAge) {
    await this.destroy(oldSessionId);
    return await this.create(userId, data, maxAge);
  }

  async cleanup() {
    const [result] = await this.db.execute('DELETE FROM user_sessions WHERE expires_at < NOW()');
    return result.affectedRows;
  }
}

export default SessionStore;