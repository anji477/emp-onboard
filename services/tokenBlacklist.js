class TokenBlacklist {
  constructor(db) {
    this.db = db;
    this.initTable();
  }

  async initTable() {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS blacklisted_tokens (
        token_hash VARCHAR(64) PRIMARY KEY,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_expires (expires_at)
      )
    `);
  }

  async blacklist(token) {
    const crypto = await import('crypto');
    const tokenHash = crypto.default.createHash('sha256').update(token).digest('hex');
    
    // Extract expiry from JWT
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiresAt = new Date(payload.exp * 1000);
    
    await this.db.execute(
      'INSERT IGNORE INTO blacklisted_tokens (token_hash, expires_at) VALUES (?, ?)',
      [tokenHash, expiresAt]
    );
  }

  async isBlacklisted(token) {
    const crypto = await import('crypto');
    const tokenHash = crypto.default.createHash('sha256').update(token).digest('hex');
    
    const [result] = await this.db.execute(
      'SELECT 1 FROM blacklisted_tokens WHERE token_hash = ? AND expires_at > NOW()',
      [tokenHash]
    );
    
    return result.length > 0;
  }

  async cleanup() {
    const [result] = await this.db.execute('DELETE FROM blacklisted_tokens WHERE expires_at < NOW()');
    return result.affectedRows;
  }
}

export default TokenBlacklist;