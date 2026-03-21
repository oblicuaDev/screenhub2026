const router = require('express').Router();
const ctrl = require('../controllers/subscriptionsController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.get('/current', ctrl.getCurrent);
router.get('/transactions', ctrl.getTransactions);
router.post('/checkout', ctrl.initiateCheckout);

module.exports = router;
