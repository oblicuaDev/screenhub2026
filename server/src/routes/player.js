const router = require('express').Router();
const ctrl = require('../controllers/playerController');

// Public — no authentication
router.get('/code/:code', ctrl.getByShortCode);
router.get('/:slug', ctrl.getBySlug);

module.exports = router;
