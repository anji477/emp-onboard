// Settings Controller - Handles organization settings CRUD operations
import db from '../db-mysql.js';

// In-memory cache for settings (production should use Redis)
let settingsCache = new Map();
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all organization settings with caching
 */
export const getSettings = async (req, res) => {
  try {
    // Check cache validity
    const now = Date.now();
    if (settingsCache.size > 0 && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      return res.json(Object.fromEntries(settingsCache));
    }

    // Fetch from database
    const [rows] = await db.execute(
      'SELECT setting_key, setting_value, category, description, updated_at FROM organization_settings ORDER BY category, setting_key'
    );

    // Rebuild cache
    settingsCache.clear();
    const settings = {};
    
    rows.forEach(row => {
      const parsedValue = typeof row.setting_value === 'string' 
        ? JSON.parse(row.setting_value) 
        : row.setting_value;
      
      settings[row.setting_key] = {
        value: parsedValue,
        category: row.category,
        description: row.description,
        updatedAt: row.updated_at
      };
      
      settingsCache.set(row.setting_key, settings[row.setting_key]);
    });

    cacheTimestamp = now;
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

/**
 * Update multiple settings atomically
 */
export const updateSettings = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { settings } = req.body;
    const userId = req.user.id;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'Invalid settings format' });
    }

    // Update or insert each setting
    for (const [key, value] of Object.entries(settings)) {
      await connection.execute(
        'INSERT INTO organization_settings (setting_key, setting_value, category, updated_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
        [key, JSON.stringify(value), 'system', userId]
      );
    }

    await connection.commit();
    
    // Invalidate cache
    settingsCache.clear();
    cacheTimestamp = null;
    
    res.json({ message: 'Settings updated successfully' });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  } finally {
    connection.release();
  }
};