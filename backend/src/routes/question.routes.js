const router   = require('express').Router();
const ctrl     = require('../controllers/question.controller');
const { protect, authorise } = require('../middleware/auth.middleware');

const canManage = ['super_admin','school_admin','exam_officer','subject_teacher','class_teacher'];

router.use(protect);
router.get('/',    ctrl.getQuestions);
router.post('/bulk', authorise(...canManage), ctrl.bulkCreateQuestions);
router.post('/',   authorise(...canManage), ctrl.createQuestion);
router.get('/:id', ctrl.getQuestion);
router.put('/:id', authorise(...canManage), ctrl.updateQuestion);
router.delete('/:id', authorise(...canManage), ctrl.deleteQuestion);

module.exports = router;
