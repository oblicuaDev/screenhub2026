const db = require('../db');
const { logActivity } = require('../utils/activityLogger');

// POST /api/webhooks/mercadopago
// Handles payment notifications from MercadoPago
exports.webhook = async (req, res) => {
  const { type, data } = req.body;

  // Always respond 200 immediately to acknowledge receipt
  res.sendStatus(200);

  try {
    if (type === 'payment') {
      await handlePayment(data?.id);
    } else if (type === 'subscription_preapproval') {
      await handleSubscription(data?.id);
    }
  } catch (err) {
    console.error('[MP/webhook]', err);
  }
};

async function handlePayment(paymentId) {
  if (!paymentId) return;

  // Get MP config for API call
  const mpRes = await db.query(
    'SELECT access_token FROM mercadopago_configs WHERE is_active = true AND deleted_at IS NULL LIMIT 1'
  );
  if (!mpRes.rows[0]) return;

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpRes.rows[0].access_token}` },
    });
    const payment = await response.json();

    if (!payment || !payment.external_reference) return;

    const orgId = payment.external_reference;
    const status = payment.status === 'approved' ? 'approved' : 'rejected';

    // Find active subscription for this org
    const subRes = await db.query(
      `SELECT id FROM subscriptions WHERE organization_id = $1 AND status = 'active' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [orgId]
    );

    await db.query(
      `INSERT INTO transactions (organization_id, subscription_id, mercadopago_payment_id, amount, currency, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [
        orgId,
        subRes.rows[0]?.id || null,
        String(paymentId),
        payment.transaction_amount || 0,
        payment.currency_id || 'ARS',
        status,
        status === 'approved' ? new Date() : null,
      ]
    );

    if (status === 'approved') {
      await logActivity({
        organizationId: orgId,
        action: 'payment_approved',
        entityType: 'transaction',
        description: `Payment ${paymentId} approved`,
      });
    }
  } catch (err) {
    console.error('[MP/handlePayment]', err);
  }
}

async function handleSubscription(subscriptionId) {
  if (!subscriptionId) return;

  const mpRes = await db.query(
    'SELECT access_token FROM mercadopago_configs WHERE is_active = true AND deleted_at IS NULL LIMIT 1'
  );
  if (!mpRes.rows[0]) return;

  try {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${mpRes.rows[0].access_token}` },
    });
    const sub = await response.json();

    if (!sub || !sub.external_reference) return;

    const orgId = sub.external_reference;

    if (sub.status === 'cancelled') {
      await db.query(
        `UPDATE subscriptions SET status = 'canceled'
         WHERE mercadopago_subscription_id = $1 AND deleted_at IS NULL`,
        [String(subscriptionId)]
      );

      // Unpublish all screens when subscription is canceled
      await db.query(
        `UPDATE screens SET status = 'draft'
         WHERE organization_id = $1 AND status = 'published' AND deleted_at IS NULL`,
        [orgId]
      );

      await logActivity({
        organizationId: orgId,
        action: 'subscription_canceled',
        description: `Subscription ${subscriptionId} canceled — screens unpublished`,
      });
    }
  } catch (err) {
    console.error('[MP/handleSubscription]', err);
  }
}

// GET /api/mercadopago/config — superadmin
exports.getConfig = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, public_key, is_sandbox, is_active, created_at FROM mercadopago_configs WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1'
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
};

// PUT /api/mercadopago/config — superadmin
exports.saveConfig = async (req, res) => {
  const { publicKey, accessToken, webhookSecret, isSandbox } = req.body;
  if (!publicKey || !accessToken) {
    return res.status(400).json({ error: 'publicKey and accessToken are required' });
  }

  try {
    // Deactivate old configs
    await db.query(
      'UPDATE mercadopago_configs SET is_active = false, updated_by = $1 WHERE deleted_at IS NULL',
      [req.user.id]
    );

    const { rows } = await db.query(
      `INSERT INTO mercadopago_configs (public_key, access_token, webhook_secret, is_sandbox, is_active, created_by)
       VALUES ($1, $2, $3, $4, true, $5) RETURNING id, public_key, is_sandbox, is_active, created_at`,
      [publicKey, accessToken, webhookSecret || null, isSandbox !== false, req.user.id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('[MP/saveConfig]', err);
    res.status(500).json({ error: 'Failed to save config' });
  }
};
