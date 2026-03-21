const router = require('express').Router();
const ctrl = require('../controllers/mercadopagoController');

// MercadoPago sends raw JSON — no auth needed (signature validated internally)
router.post('/mercadopago', ctrl.webhook);

module.exports = router;
