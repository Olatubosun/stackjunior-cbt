const router = require('express').Router();
const ctrl   = require('../controllers/result.controller');
const { protect, authorise } = require('../middleware/auth.middleware');

const canReview = ['super_admin','school_admin','exam_officer','subject_teacher','class_teacher'];

router.use(protect);
router.get('/',                   ctrl.listResults);
router.post('/start',             authorise('student'), ctrl.startExam);
router.post('/:id/submit',        authorise('student'), ctrl.submitExam);
router.get('/my',                 authorise('student'), ctrl.getMyResults);
router.get('/exam/:examId',       authorise(...canReview), ctrl.getExamResults);
router.patch('/release-bulk',     authorise(...canReview), ctrl.releaseBulk); // before /:id/... routes
router.get('/:id',                ctrl.getResult); // after /my and /exam/:examId so it doesn't shadow them
router.patch('/:id/answers/:answerId', authorise(...canReview), ctrl.markAnswer);
router.patch('/:id/mark',         authorise(...canReview), ctrl.markResult);
router.patch('/:id/release',      authorise(...canReview), ctrl.releaseResult);

module.exports = router;
