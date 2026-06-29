const router = require('express').Router();
const ctrl   = require('../controllers/result.controller');
const { protect, authorise } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/',                   ctrl.listResults);
router.post('/start',             authorise('student'), ctrl.startExam);
router.post('/:id/submit',        authorise('student'), ctrl.submitExam);
router.get('/my',                 authorise('student'), ctrl.getMyResults);
router.get('/exam/:examId',       authorise('super_admin','school_admin','exam_officer','subject_teacher','class_teacher'), ctrl.getExamResults);
router.get('/:id',                ctrl.getResult); // after /my and /exam/:examId so it doesn't shadow them
router.patch('/:id/release',      authorise('class_teacher','school_admin','exam_officer'), ctrl.releaseResult);

module.exports = router;
