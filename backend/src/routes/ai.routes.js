const router = require('express').Router();
const ctrl   = require('../controllers/ai.controller');
const { protect, authorise } = require('../middleware/auth.middleware');

const teachers = ['super_admin','school_admin','exam_officer','subject_teacher'];

router.use(protect);

// Paths the frontend uses
router.post('/generate-questions',  authorise(...teachers), ctrl.generateFromPrompt);
router.post('/generate-from-text',  authorise(...teachers), ctrl.generateFromContent);
router.post('/save-generated',      authorise(...teachers), ctrl.saveGeneratedQuestions);
router.post('/mark-answer',         ctrl.markTheory);
router.post('/generate-feedback',   ctrl.getFeedback);

// Legacy aliases (older paths still work)
router.post('/generate/prompt',     authorise(...teachers), ctrl.generateFromPrompt);
router.post('/generate/content',    authorise(...teachers), ctrl.generateFromContent);
router.post('/generate/save',       authorise(...teachers), ctrl.saveGeneratedQuestions);
router.post('/mark/theory',         ctrl.markTheory);
router.post('/feedback',            ctrl.getFeedback);

module.exports = router;
