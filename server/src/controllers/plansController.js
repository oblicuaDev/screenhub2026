const db = require('../db');

// GET /api/plans — public (used by register page)
exports.list = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, screen_limit, storage_limit_gb, price_monthly, price_annual, display_order
       FROM plans
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY display_order ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error('[Plans/list]', err);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Superadmin: GET /api/superadmin/plans
exports.listAll = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM plans WHERE deleted_at IS NULL ORDER BY display_order ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Superadmin: POST /api/superadmin/plans
exports.create = async (req, res) => {
  const { name, screenLimit, storageGb, priceMonthly, priceAnnual, displayOrder } = req.body;
  if (!name || screenLimit === undefined) {
    return res.status(400).json({ error: 'name and screenLimit are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO plans (name, screen_limit, storage_limit_gb, price_monthly, price_annual, display_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, screenLimit, storageGb || 5, priceMonthly || 0, priceAnnual || 0, displayOrder || 0, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

// Superadmin: PUT /api/superadmin/plans/:id
exports.update = async (req, res) => {
  const { name, screenLimit, storageGb, priceMonthly, priceAnnual, isActive, displayOrder } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE plans SET
         name = COALESCE($1, name),
         screen_limit = COALESCE($2, screen_limit),
         storage_limit_gb = COALESCE($3, storage_limit_gb),
         price_monthly = COALESCE($4, price_monthly),
         price_annual = COALESCE($5, price_annual),
         is_active = COALESCE($6, is_active),
         display_order = COALESCE($7, display_order),
         updated_by = $8
       WHERE id = $9 AND deleted_at IS NULL RETURNING *`,
      [name, screenLimit, storageGb, priceMonthly, priceAnnual, isActive, displayOrder, req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
};
