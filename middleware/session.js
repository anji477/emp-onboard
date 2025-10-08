import SessionStore from '../services/sessionStore.js';
import crypto from 'crypto';

let sessionStore;

export const initSessionStore = (db) => {
  sessionStore = new SessionStore(db);
  
  // Cleanup expired sessions every 15 minutes
  setInterval(() => {
    sessionStore.cleanup().catch(console.error);
  }, 15 * 60 * 1000);
  
  return sessionStore;
};

export const sessionMiddleware = async (req, res, next) => {
  const sessionId = req.cookies.sessionId;
  
  req.session = {
    id: null,
    userId: null,
    data: {},
    isNew: true,
    loggedOut: false,
    
    async save() {
      try {
        if (this.isNew) {
          this.id = await sessionStore.create(this.userId, this.data);
          this.isNew = false;
          
          res.cookie('sessionId', this.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
          });
        } else if (this.id) {
          await sessionStore.update(this.id, this.data);
        }
      } catch (error) {
        console.error('Session save error:', error);
        throw error;
      }
    },
    
    async destroy() {
      if (this.id) {
        await sessionStore.destroy(this.id);
      }
      res.clearCookie('sessionId', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
      this.id = null;
      this.userId = null;
      this.data = {};
      this.isNew = true;
      this.loggedOut = true;
    },
    
    async regenerate() {
      if (this.id && this.userId) {
        const newId = await sessionStore.regenerate(this.id, this.userId, this.data);
        this.id = newId;
        
        res.cookie('sessionId', newId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      }
    }
  };
  
  // Load existing session only if sessionId exists and is valid
  if (sessionId) {
    try {
      const session = await sessionStore.get(sessionId);
      if (session) {
        req.session.id = session.id;
        req.session.userId = session.userId;
        req.session.data = session.data;
        req.session.isNew = false;
      } else {
        // Session ID exists but no valid session - user logged out
        req.session.loggedOut = true;
      }
    } catch (error) {
      console.error('Session load error:', error);
      req.session.loggedOut = true;
    }
  }
  
  next();
};

export const requireSession = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Session required' });
  }
  next();
};