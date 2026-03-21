const router = require('express').Router();
const ctrl = require('../controllers/screensController');
const { authenticate, requireAdmin, requireEditor } = require('../middleware/auth');

router.use(authenticate);
router.get('/', requireEditor, ctrl.list);
router.get('/:id', requireEditor, ctrl.get);
router.post('/', requireEditor, ctrl.create);
router.put('/:id', requireEditor, ctrl.update);
router.post('/:id/publish', requireEditor, ctrl.publish);
router.post('/:id/unpublish', requireEditor, ctrl.unpublish);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
