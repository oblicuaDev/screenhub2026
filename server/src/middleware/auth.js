const jwt = require('jsonwebtoken');
const db = require('../db');

// Verify JWT and attach full user+org context to req
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.organization_id,
              o.name AS org_name, o.is_active AS org_active, o.trial_ends_at,
              o.plan_id,
              p.screen_limit, p.storage_limit_gb, p.name AS plan_name,
              s.status AS subscription_status, s.ends_at AS subscription_ends_at
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id AND o.deleted_at IS NULL
       LEFT JOIN plans p ON p.id = o.plan_id AND p.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT status, ends_at FROM subscriptions
         WHERE organization_id = o.id AND status = 'active' AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       ) s ON true
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [payload.userId]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    // Determine trial/subscription state for non-superadmin
    if (user.role !== 'superadmin' && user.organization_id) {
      const trialExpired = user.trial_ends_at && new Date(user.trial_ends_at) < new Date();
      const hasActiveSub = user.subscription_status === 'active';
      req.trialExpired = trialExpired && !hasActiveSub;
    } else {
      req.trialExpired = false;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth]', err);
    res.status(500).json({ error: 'Authentication error' });
  }
}

// Role-based access control middleware factory
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

const requireSuperAdmin = requireRole('superadmin');
const requireAdmin = requireRole('superadmin', 'admin');
const requireEditor = requireRole('superadmin', 'admin', 'editor');

module.exports = { authenticate, requireRole, requireSuperAdmin, requireAdmin, requireEditor };
