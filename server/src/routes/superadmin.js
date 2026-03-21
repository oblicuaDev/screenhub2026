const router = require('express').Router();
const superadmin = require('../controllers/superadminController');
const plans = require('../controllers/plansController');
const subs = require('../controllers/subscriptionsController');
const mp = require('../controllers/mercadopagoController');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

router.use(authenticate, requireSuperAdmin);

// Stats
router.get('/stats', superadmin.getStats);

// Organizations
router.get('/organizations', superadmin.listOrganizations);
router.put('/organizations/:id/toggle', superadmin.toggleOrg);

// Users
router.get('/users', superadmin.listUsers);

// Screens
router.get('/screens', superadmin.listScreens);

// Transactions
router.get('/transactions', superadmin.listTransactions);

// Plans
router.get('/plans', plans.listAll);
router.post('/plans', plans.create);
router.put('/plans/:id', plans.update);

// Assign plan to org
router.post('/subscriptions/assign', subs.assignPlan);

// MercadoPago config
router.get('/mercadopago', mp.getConfig);
router.put('/mercadopago', mp.saveConfig);

// System settings
router.get('/settings', superadmin.getSettings);
router.put('/settings', superadmin.updateSettings);

// Activity logs
router.get('/activity-logs', superadmin.getActivityLogs);

// Plans also available at /api/plans publicly
module.exports = router;
