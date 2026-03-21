const db = require('../db');

// Public endpoint — no auth required
// GET /play/:slug OR GET /play/code/:shortCode
exports.getBySlug = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.status, s.orientation, s.is_touch,
              s.touch_timeout_seconds, s.public_url_slug, s.short_code,
              tc.intro_type, tc.intro_source_url
       FROM screens s
       LEFT JOIN screen_touch_configs tc ON tc.screen_id = s.id AND tc.deleted_at IS NULL
       WHERE s.public_url_slug = $1 AND s.deleted_at IS NULL`,
      [req.params.slug]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Screen not found' });

    const screen = rows[0];
    if (screen.status !== 'published') {
      return res.status(200).json({
        screen: { ...screen, status: 'unavailable' },
        content: [],
        message: 'Screen is not available',
      });
    }

    const { rows: content } = await db.query(
      `SELECT id, type, source_url, duration_seconds, position, is_muted, metadata
       FROM screen_contents
       WHERE screen_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC`,
      [screen.id]
    );

    res.json({ screen, content });
  } catch (err) {
    console.error('[Player/getBySlug]', err);
    res.status(500).json({ error: 'Failed to load screen' });
  }
};

exports.getByShortCode = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.status, s.orientation, s.is_touch,
              s.touch_timeout_seconds, s.public_url_slug, s.short_code,
              tc.intro_type, tc.intro_source_url
       FROM screens s
       LEFT JOIN screen_touch_configs tc ON tc.screen_id = s.id AND tc.deleted_at IS NULL
       WHERE s.short_code = $1 AND s.deleted_at IS NULL`,
      [req.params.code.toUpperCase()]
    );

    if (!rows[0]) return res.status(404).json({ error: 'Screen not found' });

    const screen = rows[0];
    if (screen.status !== 'published') {
      return res.status(200).json({
        screen: { ...screen, status: 'unavailable' },
        content: [],
        message: 'Screen is not available',
      });
    }

    const { rows: content } = await db.query(
      `SELECT id, type, source_url, duration_seconds, position, is_muted, metadata
       FROM screen_contents
       WHERE screen_id = $1 AND deleted_at IS NULL
       ORDER BY position ASC`,
      [screen.id]
    );

    res.json({ screen, content });
  } catch (err) {
    console.error('[Player/getByShortCode]', err);
    res.status(500).json({ error: 'Failed to load screen' });
  }
};
