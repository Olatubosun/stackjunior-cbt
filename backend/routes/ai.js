const express = require('express');
const router  = express.Router();
const {
  generateQuestions, generateFromText,
  scanPaper, markAnswer, generateFeedback
} = require('../controllers/aiController');
const { protect, authorise } = require('../middleware/auth');

router.use(protect);

router.post('/generate-questions',
  authorise('teacher', 'school_admin', 'super_admin'),
  generateQuestions
);
router.post('/generate-from-text',
  authorise('teacher', 'school_admin', 'super_admin'),
  generateFromText
);
router.post('/scan-paper',
  authorise('teacher', 'school_admin', 'super_admin'),
  scanPaper
);
router.post('/mark-answer',
  authorise('teacher', 'school_admin', 'super_admin'),
  markAnswer
);
router.post('/generate-feedback', generateFeedback);

module.exports = router;
