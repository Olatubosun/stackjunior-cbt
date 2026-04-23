const express = require('express');
const router  = express.Router();
const {
  getResults, getResult, markAnswer,
  releaseResult, getExamAnalytics
} = require('../controllers/resultController');
const { protect, authorise } = require('../middleware/auth');

router.use(protect);

router.get('/', getResults);
router.get('/exam/:examId/analytics',
  authorise('teacher', 'school_admin', 'super_admin'),
  getExamAnalytics
);
router.get('/:id', getResult);
router.put('/:id/answers/:answerId',
  authorise('teacher', 'school_admin', 'super_admin'),
  markAnswer
);
router.put('/:id/release',
  authorise('teacher', 'school_admin', 'super_admin'),
  releaseResult
);

module.exports = router;
