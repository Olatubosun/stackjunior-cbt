const router = require('express').Router();
const ctrl   = require('../controllers/exam.controller');
const { protect, authorise } = require('../middleware/auth.middleware');
const examAccess = require('../middleware/exam-access.middleware');

const canManage = ['super_admin','school_admin','exam_officer','subject_teacher'];

router.use(protect);
router.get('/',          ctrl.getExams);
router.post('/',         authorise(...canManage), ctrl.createExam);
router.get('/:id',       examAccess(),                                ctrl.getExam);
router.put('/:id',       authorise(...canManage), examAccess(),       ctrl.updateExam);
router.patch('/:id/publish', authorise(...canManage), examAccess(),   ctrl.publishExam);

module.exports = router;
