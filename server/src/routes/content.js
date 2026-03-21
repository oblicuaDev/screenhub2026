const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/contentController');
const { authenticate, requireEditor } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(authenticate, requireEditor);
router.get('/', ctrl.list);
router.post('/', upload.single('file'), ctrl.create);
router.put('/reorder', ctrl.reorder);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
