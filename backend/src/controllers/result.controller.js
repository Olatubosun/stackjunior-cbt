const { Result, Exam, Question, Answer, User } = require('../models');

// GET /api/results  — list results relevant to the logged-in user
exports.listResults = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      const results = await Result.findAll({
        where: { student: req.user.id },
        include: [{ model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject'] }],
        order: [['createdAt', 'DESC']],
      });
      return res.json({ results, count: results.length });
    }
    // Teachers / admins: all results within their school
    const results = await Result.findAll({
      include: [
        {
          model: User,
          as: 'studentUser',
          attributes: ['id', 'name', 'examNumber', 'class', 'school'],
          where: req.user.school ? { school: req.user.school } : undefined,
        },
        { model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ results, count: results.length });
  } catch (err) { next(err); }
};

// POST /api/results/start  — student starts an exam
exports.startExam = async (req, res, next) => {
  try {
    const { examId } = req.body;
    if (!examId) return res.status(400).json({ error: 'examId is required.' });

    // Enforce school + class scoping at start time
    const exam = await Exam.findByPk(examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });
    if (!req.user.school || exam.school !== req.user.school) {
      return res.status(403).json({ error: 'You do not have access to this exam.' });
    }
    if (req.user.classId && exam.classId && exam.classId !== req.user.classId) {
      return res.status(403).json({ error: 'This exam is not for your class.' });
    }
    if (!['active', 'published'].includes(exam.status)) {
      return res.status(403).json({ error: 'This exam is not currently available.' });
    }

    const existing = await Result.findOne({
      where: { student: req.user.id, exam: examId, status: 'in_progress' },
    });
    if (existing) return res.json({ result: existing });
    const result = await Result.create({
      student: req.user.id,
      exam:    examId,
      startedAt: new Date(),
      status:  'in_progress',
    });
    res.status(201).json({ result });
  } catch (err) { next(err); }
};

// POST /api/results/:id/submit  — student submits answers
exports.submitExam = async (req, res, next) => {
  try {
    const { answers, timeUsed } = req.body;
    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    if (result.student !== req.user.id)
      return res.status(403).json({ error: 'Not authorised.' });

    const exam = await Exam.findByPk(result.exam, {
      include: [{ model: Question, as: 'questions' }],
    });
    if (!exam) return res.status(404).json({ error: 'Exam not found.' });

    let totalScore = 0;
    const rows = [];

    for (const ans of answers) {
      const q = exam.questions.find(q => q.id === ans.questionId);
      if (!q) continue;
      let correct = false;
      let marks   = 0;

      if (['multiple_choice', 'true_false'].includes(q.type)) {
        const correctOpt = (q.options || []).find(o => o.isCorrect);
        correct = correctOpt?._id === ans.answer;
        marks   = correct ? (q.markingGuide?.maxMarks || 1) : 0;
        totalScore += marks;
      }

      rows.push({
        resultId:      result.id,
        questionId:    q.id,
        studentAnswer: ans.answer,
        isCorrect:     correct,
        marksAwarded:  marks,
      });
    }

    // Replace any prior answers for this result
    await Answer.destroy({ where: { resultId: result.id } });
    if (rows.length) await Answer.bulkCreate(rows);

    await result.update({
      totalScore,
      percentage:  Math.round((totalScore / exam.totalMarks) * 100),
      passed:      (totalScore / exam.totalMarks) * 100 >= exam.passMark,
      grade:       calcGrade(Math.round((totalScore / exam.totalMarks) * 100)),
      timeUsed,
      submittedAt: new Date(),
      status:      'submitted',
    });

    const full = await Result.findByPk(result.id, {
      include: [{ model: Answer, as: 'answers' }],
    });
    res.json({ result: full });
  } catch (err) { next(err); }
};

// GET /api/results/my  — student's own results
exports.getMyResults = async (req, res, next) => {
  try {
    const results = await Result.findAll({
      where: { student: req.user.id, status: 'released' },
      include: [{ model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ results });
  } catch (err) { next(err); }
};

// GET /api/results/exam/:examId  — teacher sees all results for an exam
exports.getExamResults = async (req, res, next) => {
  try {
    const results = await Result.findAll({
      where: { exam: req.params.examId },
      include: [{
        model: User,
        as: 'studentUser',
        attributes: ['id', 'name', 'examNumber', 'class'],
      }],
      order: [['totalScore', 'DESC']],
    });
    res.json({ results });
  } catch (err) { next(err); }
};

// PATCH /api/results/:id/release  — teacher/class teacher releases result
exports.releaseResult = async (req, res, next) => {
  try {
    const { teacherFeedback, classTeacherNote } = req.body;
    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    await result.update({
      status: 'released',
      releasedAt: new Date(),
      releasedBy: req.user.id,
      teacherFeedback,
      classTeacherNote,
    });
    res.json({ result, message: 'Result released.' });
  } catch (err) { next(err); }
};

function calcGrade(pct) {
  if (pct >= 75) return 'A1';
  if (pct >= 70) return 'B2';
  if (pct >= 65) return 'B3';
  if (pct >= 60) return 'C4';
  if (pct >= 55) return 'C5';
  if (pct >= 50) return 'C6';
  if (pct >= 45) return 'D7';
  if (pct >= 40) return 'E8';
  return 'F9';
}
