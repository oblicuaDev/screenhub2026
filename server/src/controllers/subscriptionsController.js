const db = require('../db');
const { logActivity } = require('../utils/activityLogger');

// GET /api/subscriptions/current
exports.getCurrent = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, p.name AS plan_name, p.screen_limit, p.storage_limit_gb,
              p.price_monthly, p.price_annual
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id AND p.deleted_at IS NULL
       WHERE s.organization_id = $1 AND s.status = 'active' AND s.deleted_at IS NULL
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.organization_id]
    );

    const { rows: orgRows } = await db.query(
      'SELECT trial_ends_at, plan_id FROM organizations WHERE id = $1 AND deleted_at IS NULL',
      [req.user.organization_id]
    );

    const trialEndsAt = orgRows[0]?.trial_ends_at;
    const trialExpired = trialEndsAt && new Date(trialEndsAt) < new Date();

    res.json({
      subscription: rows[0] || null,
      trialEndsAt,
      trialExpired,
      isOnTrial: !rows[0] && !trialExpired,
    });
  } catch (err) {
    console.error('[Subscriptions/getCurrent]', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

// GET /api/subscriptions/transactions
exports.getTransactions = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, s.mercadopago_subscription_id
       FROM transactions t
       LEFT JOIN subscriptions s ON s.id = t.subscription_id AND s.deleted_at IS NULL
       WHERE t.organization_id = $1 AND t.deleted_at IS NULL
       ORDER BY t.created_at DESC`,
      [req.user.organization_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[Subscriptions/getTransactions]', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// POST /api/subscriptions/checkout — initiates MP subscription
exports.initiateCheckout = async (req, res) => {
  const { planId, billingCycle } = req.body; // billingCycle: 'monthly' | 'annual'

  try {
    const planRes = await db.query(
      'SELECT * FROM plans WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
      [planId]
    );
    if (!planRes.rows[0]) return res.status(404).json({ error: 'Plan not found' });

    const plan = planRes.rows[0];

    // Get MP config
    const mpRes = await db.query(
      'SELECT * FROM mercadopago_configs WHERE is_active = true AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
    );
    if (!mpRes.rows[0]) {
      return res.status(503).json({ error: 'Payment provider not configured' });
    }

    const amount = billingCycle === 'annual' ? plan.price_annual : plan.price_monthly;

    // In production, create a real MP subscription link here
    // For now, return the checkout data for the frontend to use with MP SDK
    res.json({
      planId: plan.id,
      planName: plan.name,
      amount,
      currency: 'ARS',
      billingCycle,
      mpPublicKey: mpRes.rows[0].public_key,
      isSandbox: mpRes.rows[0].is_sandbox,
    });
  } catch (err) {
    console.error('[Subscriptions/initiateCheckout]', err);
    res.status(500).json({ error: 'Failed to initiate checkout' });
  }
};

// Superadmin: manually assign plan to org
exports.assignPlan = async (req, res) => {
  const { organizationId, planId } = req.body;

  try {
    // Deactivate existing subscriptions
    await db.query(
      `UPDATE subscriptions SET status = 'canceled', updated_by = $1
       WHERE organization_id = $2 AND status = 'active' AND deleted_at IS NULL`,
      [req.user.id, organizationId]
    );

    // Create new subscription
    const { rows } = await db.query(
      `INSERT INTO subscriptions (organization_id, plan_id, status, started_at, created_by)
       VALUES ($1, $2, 'active', NOW(), $3) RETURNING *`,
      [organizationId, planId, req.user.id]
    );

    // Update org plan
    await db.query(
      'UPDATE organizations SET plan_id = $1, updated_by = $2 WHERE id = $3',
      [planId, req.user.id, organizationId]
    );

    await logActivity({
      userId: req.user.id,
      organizationId,
      action: 'plan_assigned',
      entityType: 'subscription',
      entityId: rows[0].id,
      description: `Plan manually assigned by superadmin`,
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[Subscriptions/assignPlan]', err);
    res.status(500).json({ error: 'Failed to assign plan' });
  }
};
