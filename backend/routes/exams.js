const express = require('express');
const router  = express.Router();
const {
  getExams, getExam, createExam, updateExam,
  deleteExam, startExam, submitExam
} = require('../controllers/examController');
const { protect, authorise } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getExams)
  .post(authorise('teacher', 'school_admin', 'super_admin'), createExam);

router.route('/:id')
  .get(getExam)
  .put(authorise('teacher', 'school_admin', 'super_admin'), updateExam)
  .delete(authorise('teacher', 'school_admin', 'super_admin'), deleteExam);

router.post('/:id/start',  authorise('student'), startExam);
router.post('/:id/submit', authorise('student'), submitExam);

module.exports = router;
