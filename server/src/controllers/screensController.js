const db = require('../db');
const { logActivity } = require('../utils/activityLogger');
const { generateUniqueShortCode, generateUniqueSlug } = require('../utils/shortCode');

// GET /api/screens
exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*,
              u.name AS created_by_name,
              (SELECT COUNT(*) FROM screen_contents sc WHERE sc.screen_id = s.id AND sc.deleted_at IS NULL) AS content_count
       FROM screens s
       LEFT JOIN users u ON u.id = s.created_by AND u.deleted_at IS NULL
       WHERE s.organization_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.created_at DESC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Screens/list]', err);
    res.status(500).json({ error: 'Failed to fetch screens' });
  }
};

// GET /api/screens/:id
exports.get = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name AS created_by_name,
              tc.intro_type, tc.intro_source_url
       FROM screens s
       LEFT JOIN users u ON u.id = s.created_by AND u.deleted_at IS NULL
       LEFT JOIN screen_touch_configs tc ON tc.screen_id = s.id AND tc.deleted_at IS NULL
       WHERE s.id = $1 AND s.organization_id = $2 AND s.deleted_at IS NULL`,
      [req.params.id, req.user.organization_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Screen not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[Screens/get]', err);
    res.status(500).json({ error: 'Failed to fetch screen' });
  }
};

// POST /api/screens
exports.create = async (req, res) => {
  const { name, description, orientation, isTouch, touchTimeoutSeconds } = req.body;
  if (!name) return res.status(400).json({ error: 'Screen name is required' });

  if (req.trialExpired) {
    return res.status(403).json({ error: 'Trial expired. Please subscribe to create screens.' });
  }

  try {
    const shortCode = await generateUniqueShortCode(db);
    const slug = await generateUniqueSlug(db, name);

    const { rows } = await db.query(
      `INSERT INTO screens
         (organization_id, name, description, orientation, is_touch, touch_timeout_seconds,
          public_url_slug, short_code, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
       RETURNING *`,
      [
        req.user.organization_id,
        name.trim(),
        description || null,
        orientation || 'horizontal',
        isTouch === true || isTouch === 'true',
        touchTimeoutSeconds || 60,
        slug,
        shortCode,
        req.user.id,
      ]
    );

    await logActivity({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'screen_created',
      entityType: 'screen',
      entityId: rows[0].id,
      description: `Screen "${name}" created`,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[Screens/create]', err);
    res.status(500).json({ error: 'Failed to create screen' });
  }
};

// PUT /api/screens/:id
exports.update = async (req, res) => {
  const { name, description, orientation, isTouch, touchTimeoutSeconds } = req.body;

  try {
    // Verify ownership
    const check = await db.query(
      'SELECT id, status FROM screens WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.user.organization_id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Screen not found' });

    const { rows } = await db.query(
      `UPDATE screens SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         orientation = COALESCE($3, orientation),
         is_touch = COALESCE($4, is_touch),
         touch_timeout_seconds = COALESCE($5, touch_timeout_seconds),
         updated_by = $6
       WHERE id = $7 AND organization_id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : null,
        orientation || null,
        isTouch !== undefined ? (isTouch === true || isTouch === 'true') : null,
        touchTimeoutSeconds || null,
        req.user.id,
        req.params.id,
        req.user.organization_id,
      ]
    );

    await logActivity({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'screen_updated',
      entityType: 'screen',
      entityId: rows[0].id,
      description: `Screen "${rows[0].name}" updated`,
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[Screens/update]', err);
    res.status(500).json({ error: 'Failed to update screen' });
  }
};

// POST /api/screens/:id/publish
exports.publish = async (req, res) => {
  if (req.trialExpired) {
    return res.status(403).json({ error: 'Trial expired. Please subscribe to publish screens.' });
  }

  try {
    const screen = await db.query(
      'SELECT id, name, status FROM screens WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.user.organization_id]
    );
    if (!screen.rows[0]) return res.status(404).json({ error: 'Screen not found' });

    if (screen.rows[0].status === 'published') {
      return res.json({ message: 'Screen is already published', screen: screen.rows[0] });
    }

    // Check plan limit
    const limitCheck = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM screens WHERE organization_id = $1 AND status = 'published' AND deleted_at IS NULL) AS published_count,
         COALESCE(p.screen_limit,
           (SELECT CAST(value AS INTEGER) FROM system_settings WHERE key = 'trial_screen_limit'), 1
         ) AS screen_limit
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id AND p.deleted_at IS NULL
       WHERE o.id = $1 AND o.deleted_at IS NULL`,
      [req.user.organization_id]
    );

    const { published_count, screen_limit } = limitCheck.rows[0];
    if (parseInt(published_count) >= parseInt(screen_limit)) {
      return res.status(403).json({
        error: `Plan limit reached. You can publish up to ${screen_limit} screen(s). Upgrade your plan to publish more.`,
        published: parseInt(published_count),
        limit: parseInt(screen_limit),
      });
    }

    const { rows } = await db.query(
      'UPDATE screens SET status = $1, updated_by = $2 WHERE id = $3 RETURNING *',
      ['published', req.user.id, req.params.id]
    );

    await logActivity({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'screen_published',
      entityType: 'screen',
      entityId: rows[0].id,
      description: `Screen "${rows[0].name}" published`,
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[Screens/publish]', err);
    res.status(500).json({ error: 'Failed to publish screen' });
  }
};

// POST /api/screens/:id/unpublish
exports.unpublish = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE screens SET status = 'draft', updated_by = $1
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [req.user.id, req.params.id, req.user.organization_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Screen not found' });

    await logActivity({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'screen_unpublished',
      entityType: 'screen',
      entityId: rows[0].id,
      description: `Screen "${rows[0].name}" unpublished`,
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[Screens/unpublish]', err);
    res.status(500).json({ error: 'Failed to unpublish screen' });
  }
};

// DELETE /api/screens/:id — admin only
exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE screens SET deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [req.user.id, req.params.id, req.user.organization_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Screen not found' });

    await logActivity({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'screen_deleted',
      entityType: 'screen',
      entityId: req.params.id,
      description: 'Screen deleted',
    });

    res.json({ message: 'Screen deleted' });
  } catch (err) {
    console.error('[Screens/remove]', err);
    res.status(500).json({ error: 'Failed to delete screen' });
  }
};
