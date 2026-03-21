const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { logActivity } = require('../utils/activityLogger');

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register — creates org + admin user + trial
exports.register = async (req, res) => {
  const { orgName, name, email, password } = req.body;

  if (!orgName || !name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const emailCheck = await client.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email.toLowerCase().trim()]
    );
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Trial settings
    const settingsRes = await client.query(
      "SELECT key, value FROM system_settings WHERE key IN ('trial_days', 'trial_screen_limit')"
    );
    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.key] = r.value; });
    const trialDays = parseInt(settings.trial_days || '14', 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create organization
    const orgRes = await client.query(
      `INSERT INTO organizations (name, trial_ends_at, is_active)
       VALUES ($1, $2, true) RETURNING id`,
      [orgName.trim(), trialEndsAt]
    );
    const orgId = orgRes.rows[0].id;

    // Create admin user
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, organization_id, name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', true)`,
      [userId, orgId, name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    await client.query(
      'UPDATE organizations SET created_by = $1 WHERE id = $2',
      [userId, orgId]
    );

    await client.query('COMMIT');

    await logActivity({
      userId,
      organizationId: orgId,
      action: 'register',
      entityType: 'organization',
      entityId: orgId,
      description: `Organization "${orgName}" registered`,
    });

    const token = signToken(userId);
    res.status(201).json({
      token,
      trialExpired: false,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'admin',
        organizationId: orgId,
        orgName: orgName.trim(),
        trialEndsAt,
        planName: null,
        screenLimit: parseInt(settings.trial_screen_limit || '1', 10),
        subscriptionStatus: null,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.password_hash, u.is_active,
              u.organization_id,
              o.name AS org_name, o.is_active AS org_active, o.trial_ends_at,
              o.plan_id,
              p.name AS plan_name, p.screen_limit,
              s.status AS subscription_status
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id AND o.deleted_at IS NULL
       LEFT JOIN plans p ON p.id = o.plan_id AND p.deleted_at IS NULL
       LEFT JOIN LATERAL (
         SELECT status FROM subscriptions
         WHERE organization_id = o.id AND status = 'active' AND deleted_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       ) s ON true
       WHERE u.email = $1 AND u.deleted_at IS NULL`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const trialExpired = user.role !== 'superadmin'
      && user.trial_ends_at
      && new Date(user.trial_ends_at) < new Date()
      && user.subscription_status !== 'active';

    await logActivity({
      userId: user.id,
      organizationId: user.organization_id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      description: `User "${user.email}" logged in`,
    });

    const token = signToken(user.id);
    res.json({
      token,
      trialExpired,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        orgName: user.org_name,
        trialEndsAt: user.trial_ends_at,
        planName: user.plan_name,
        screenLimit: user.screen_limit,
        subscriptionStatus: user.subscription_status,
      },
    });
  } catch (err) {
    console.error('[Auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const u = req.user;
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    organizationId: u.organization_id,
    orgName: u.org_name,
    trialEndsAt: u.trial_ends_at,
    planName: u.plan_name,
    screenLimit: u.screen_limit,
    subscriptionStatus: u.subscription_status,
    trialExpired: req.trialExpired,
  });
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const { rows } = await db.query(
      'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_by = $2 WHERE id = $3',
      [hash, req.user.id, req.user.id]
    );
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[Auth/changePassword]', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};
