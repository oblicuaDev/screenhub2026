const db = require('../db');
const { logActivity } = require('../utils/activityLogger');
const { USE_GCS } = require('../middleware/upload');

// Verify screen belongs to org
async function verifyScreenOwnership(screenId, orgId) {
  const { rows } = await db.query(
    'SELECT id FROM screens WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
    [screenId, orgId]
  );
  return rows.length > 0;
}

// GET /api/screens/:screenId/content
exports.list = async (req, res) => {
  try {
    const owned = await verifyScreenOwnership(req.params.screenId, req.user.organization_id);
    if (!owned) return res.status(404).json({ error: 'Screen not found' });

    const { rows } = await db.query(
      `SELECT * FROM screen_contents
       WHERE screen_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC, created_at ASC`,
      [req.params.screenId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Content/list]', err);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
};

// POST /api/screens/:screenId/content
exports.create = async (req, res) => {
  const { type, sourceUrl, durationSeconds, position, isMuted, metadata } = req.body;
  const { screenId } = req.params;

  let finalUrl = sourceUrl;
  let storagePath = null;

  if (req.file) {
    if (USE_GCS && req.file.cloudUrl) {
      finalUrl = req.file.cloudUrl;
      storagePath = req.file.cloudPath || null;
    } else {
      finalUrl = `/uploads/${req.file.filename}`;
      storagePath = req.file.path || null;
    }
  }

  const VALID_TYPES = ['image', 'video_upload', 'video_url', 'youtube', 'iframe'];
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (!finalUrl) {
    return res.status(400).json({ error: 'Source URL or file is required' });
  }

  try {
    const owned = await verifyScreenOwnership(screenId, req.user.organization_id);
    if (!owned) return res.status(404).json({ error: 'Screen not found' });

    // Get next position
    const posRes = await db.query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM screen_contents WHERE screen_id = $1 AND deleted_at IS NULL',
      [screenId]
    );
    const nextPos = position !== undefined ? parseInt(position) : posRes.rows[0].next_pos;

    const { rows } = await db.query(
      `INSERT INTO screen_contents
         (screen_id, type, source_url, storage_path, duration_seconds, position, is_muted, metadata, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        screenId,
        type,
        finalUrl,
        storagePath,
        durationSeconds || 10,
        nextPos,
        isMuted === true || isMuted === 'true',
        metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {},
        req.user.id,
      ]
    );

    await logActivity({
      userId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'content_added',
      entityType: 'screen_content',
      entityId: rows[0].id,
      description: `Content (${type}) added to screen`,
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[Content/create]', err);
    res.status(500).json({ error: 'Failed to add content' });
  }
};

// PUT /api/screens/:screenId/content/:id
exports.update = async (req, res) => {
  const { durationSeconds, position, isMuted, metadata, sourceUrl } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE screen_contents SET
         duration_seconds = COALESCE($1, duration_seconds),
         position = COALESCE($2, position),
         is_muted = COALESCE($3, is_muted),
         metadata = COALESCE($4, metadata),
         source_url = COALESCE($5, source_url),
         updated_by = $6
       WHERE id = $7 AND screen_id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [
        durationSeconds || null,
        position !== undefined ? parseInt(position) : null,
        isMuted !== undefined ? (isMuted === true || isMuted === 'true') : null,
        metadata || null,
        sourceUrl || null,
        req.user.id,
        req.params.id,
        req.params.screenId,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Content not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[Content/update]', err);
    res.status(500).json({ error: 'Failed to update content' });
  }
};

// PUT /api/screens/:screenId/content/reorder
exports.reorder = async (req, res) => {
  const { items } = req.body; // [{ id, position }]
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }

  try {
    const owned = await verifyScreenOwnership(req.params.screenId, req.user.organization_id);
    if (!owned) return res.status(404).json({ error: 'Screen not found' });

    await Promise.all(
      items.map(({ id, position }) =>
        db.query(
          'UPDATE screen_contents SET position = $1, updated_by = $2 WHERE id = $3 AND screen_id = $4 AND deleted_at IS NULL',
          [position, req.user.id, id, req.params.screenId]
        )
      )
    );
    res.json({ message: 'Order updated' });
  } catch (err) {
    console.error('[Content/reorder]', err);
    res.status(500).json({ error: 'Failed to reorder content' });
  }
};

// DELETE /api/screens/:screenId/content/:id
exports.remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE screen_contents SET deleted_at = NOW(), deleted_by = $1
       WHERE id = $2 AND screen_id = $3 AND deleted_at IS NULL`,
      [req.user.id, req.params.id, req.params.screenId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Content not found' });
    res.json({ message: 'Content removed' });
  } catch (err) {
    console.error('[Content/remove]', err);
    res.status(500).json({ error: 'Failed to remove content' });
  }
};
