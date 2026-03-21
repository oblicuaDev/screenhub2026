const bcrypt = require('bcryptjs');
const db = require('../db');
const { logActivity } = require('../utils/activityLogger');

// GET /api/superadmin/stats
exports.getStats = async (req, res) => {
  try {
    const [orgs, users, screens, subs, transactions] = await Promise.all([
      db.query('SELECT COUNT(*) AS total FROM organizations WHERE deleted_at IS NULL'),
      db.query('SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL AND role != $1', ['superadmin']),
      db.query('SELECT COUNT(*) AS total FROM screens WHERE deleted_at IS NULL'),
      db.query("SELECT COUNT(*) AS total FROM subscriptions WHERE status = 'active' AND deleted_at IS NULL"),
      db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE status = 'approved' AND deleted_at IS NULL"),
    ]);

    res.json({
      organizations: parseInt(orgs.rows[0].total),
      users: parseInt(users.rows[0].total),
      screens: parseInt(screens.rows[0].total),
      activeSubscriptions: parseInt(subs.rows[0].total),
      totalRevenue: parseFloat(transactions.rows[0].total),
    });
  } catch (err) {
    console.error('[Superadmin/stats]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/superadmin/organizations
exports.listOrganizations = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.*,
              p.name AS plan_name,
              (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.deleted_at IS NULL) AS user_count,
              (SELECT COUNT(*) FROM screens s WHERE s.organization_id = o.id AND s.deleted_at IS NULL) AS screen_count,
              (SELECT COUNT(*) FROM screens s WHERE s.organization_id = o.id AND s.status = 'published' AND s.deleted_at IS NULL) AS published_count,
              sub.status AS subscription_status
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id AND p.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT status FROM subscriptions
         WHERE organization_id = o.id AND status = 'active' AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       ) sub ON true
       WHERE o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error('[Superadmin/listOrgs]', err);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
};

// GET /api/superadmin/users
exports.listUsers = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
              o.name AS org_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id AND o.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/superadmin/screens
exports.listScreens = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.status, s.orientation, s.short_code, s.public_url_slug, s.created_at,
              o.name AS org_name
       FROM screens s
       LEFT JOIN organizations o ON o.id = s.organization_id AND o.deleted_at IS NULL
       WHERE s.deleted_at IS NULL
       ORDER BY s.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch screens' });
  }
};

// GET /api/superadmin/transactions
exports.listTransactions = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, o.name AS org_name
       FROM transactions t
       LEFT JOIN organizations o ON o.id = t.organization_id AND o.deleted_at IS NULL
       WHERE t.deleted_at IS NULL
       ORDER BY t.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// PUT /api/superadmin/organizations/:id/toggle
exports.toggleOrg = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE organizations SET is_active = NOT is_active, updated_by = $1
       WHERE id = $2 AND deleted_at IS NULL RETURNING id, name, is_active`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Organization not found' });

    await logActivity({
      userId: req.user.id,
      organizationId: req.params.id,
      action: rows[0].is_active ? 'org_activated' : 'org_deactivated',
      entityType: 'organization',
      entityId: req.params.id,
      description: `Organization "${rows[0].name}" ${rows[0].is_active ? 'activated' : 'deactivated'} by superadmin`,
    });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle organization' });
  }
};

// GET /api/superadmin/settings
exports.getSettings = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM system_settings ORDER BY key');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// PUT /api/superadmin/settings
exports.updateSettings = async (req, res) => {
  const { trialDays, trialScreenLimit } = req.body;

  try {
    if (trialDays !== undefined) {
      await db.query(
        `INSERT INTO system_settings (key, value) VALUES ('trial_days', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(parseInt(trialDays))]
      );
    }
    if (trialScreenLimit !== undefined) {
      await db.query(
        `INSERT INTO system_settings (key, value) VALUES ('trial_screen_limit', $1)
         ON CONFLICT (key) DO UPDATE SET value = $1`,
        [String(parseInt(trialScreenLimit))]
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// GET /api/superadmin/activity-logs
exports.getActivityLogs = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '100'), 500);
  const offset = parseInt(req.query.offset || '0');

  try {
    const { rows } = await db.query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email, o.name AS org_name
       FROM activity_logs al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN organizations o ON o.id = al.organization_id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};
