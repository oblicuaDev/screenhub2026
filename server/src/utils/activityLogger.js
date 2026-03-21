const db = require('../db');

async function logActivity({ userId, organizationId, action, entityType, entityId, description, metadata = {} }) {
  try {
    await db.query(
      `INSERT INTO activity_logs (user_id, organization_id, action, entity_type, entity_id, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId || null, organizationId || null, action, entityType || null, entityId || null, description || null, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Non-critical — log to console but don't throw
    console.error('[ActivityLogger] Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };
