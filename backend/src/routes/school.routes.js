const router = require('express').Router();
const ctrl = require('../controllers/school.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/me',              ctrl.getMySchool);
router.get('/me/classes',      ctrl.getMyClasses);
router.get('/:id/classes',     ctrl.getClassesForSchool);

module.exports = router;
