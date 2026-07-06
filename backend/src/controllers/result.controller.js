const { Result, Exam, Question, Answer, User } = require('../models');
const aiService = require('../services/ai.service');

// Resolve a stored option _id (what MC / true-false answers store) to a
// readable "Label. text"; leaves free-text answers untouched.
const optText = (q, val) => {
  if (!q || !Array.isArray(q.options) || !q.options.length) return val;
  const opt = q.options.find((o) => o._id === val);
  return opt ? `${opt.label ? opt.label + '. ' : ''}${opt.text}` : val;
};

// Shape a Result for the frontend: expose `exam`/`student` (not the raw
// association aliases), surface the exam's totalMarks, and make answers
// human-readable (student/correct answers resolved from option ids).
const shapeResult = (r) => {
  const j = r.toJSON ? r.toJSON() : r;
  const exam = j.examRecord || null;
  return {
    ...j,
    exam,
    student: j.studentUser || null,
    totalMarks: exam ? exam.totalMarks : null,
    teacherComment: j.teacherFeedback || null,
    answers: (j.answers || []).map((a) => {
      const q = a.question || null;
      const correctVal = q && (q.correctAnswer || ((q.options || []).find((o) => o.isCorrect) || {})._id);
      return {
        ...a,
        maxMarks: (q && q.markingGuide && q.markingGuide.maxMarks) || 1,
        studentAnswer: optText(q, a.studentAnswer),
        question: q ? {
          id: q.id, type: q.type, questionText: q.questionText,
          correctAnswer: optText(q, correctVal),
        } : null,
      };
    }),
  };
};

// GET /api/results  — list results relevant to the logged-in user
exports.listResults = async (req, res, next) => {
  try {
    if (req.user.role === 'student') {
      const results = await Result.findAll({
        where: { student: req.user.id },
        include: [{ model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject', 'totalMarks'] }],
        order: [['createdAt', 'DESC']],
      });
      const shaped = results.map(shapeResult);
      return res.json({ results: shaped, count: shaped.length });
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
        { model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject', 'totalMarks'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const shaped = results.map(shapeResult);
    res.json({ results: shaped, count: shaped.length });
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

    // Normalise a free-text answer for comparison.
    const norm = (s) => String(s ?? '')
      .trim().toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.!?;:,]+$/, '');

    let totalScore = 0;
    const rows = [];

    for (const ans of answers) {
      const q = exam.questions.find(q => q.id === ans.questionId);
      if (!q) continue;
      const maxMarks = q.markingGuide?.maxMarks || 1;
      let correct = false;
      let marks   = 0;
      let flagged = false;
      let aiMark = null, aiComment = null, aiConfidence = null;

      if (['multiple_choice', 'true_false'].includes(q.type)) {
        const correctOpt = (q.options || []).find(o => o.isCorrect);
        correct = !!correctOpt && correctOpt._id === ans.answer;
        marks   = correct ? maxMarks : 0;
      } else if (['fill_blank', 'short_answer'].includes(q.type)) {
        // Accept any answer listed in correctAnswer (separated by | / ; or ,).
        const accepted = String(q.correctAnswer ?? '')
          .split(/[|/;,]/).map(norm).filter(Boolean);
        const given = norm(ans.answer);
        correct = !!given && accepted.includes(given);
        marks   = correct ? maxMarks : 0;
        // Short answers may have valid variants — flag a miss for teacher review.
        if (!correct && given && q.type === 'short_answer') flagged = true;
      } else {
        // theory / essay — mark with AI now; the teacher can review/adjust later.
        const studentText = ans.answer != null ? String(ans.answer).trim() : '';
        if (studentText) {
          try {
            const ai = await aiService.markTheoryAnswer({
              questionText:  q.questionText,
              studentAnswer: studentText,
              markingGuide:  q.markingGuide,
            });
            aiMark       = Math.max(0, Math.min(maxMarks, Number(ai.marksAwarded) || 0));
            aiComment    = ai.comment || null;
            aiConfidence = ['high', 'medium', 'low'].includes(ai.confidence) ? ai.confidence : 'medium';
            marks        = aiMark;
          } catch (err) {
            console.error('[ai] theory marking failed:', err.message);
          }
          flagged = true; // AI-marked (or failed) — surface for teacher review
        }
      }

      totalScore += marks;
      rows.push({
        resultId:      result.id,
        questionId:    q.id,
        studentAnswer: ans.answer,
        isCorrect:     correct,
        marksAwarded:  marks,
        flagged,
        aiMark,
        aiComment,
        aiConfidence,
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

// GET /api/results/:id  — full result detail (summary + answers + questions)
exports.getResult = async (req, res, next) => {
  try {
    const result = await Result.findByPk(req.params.id, {
      include: [
        { model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject', 'totalMarks', 'passMark'] },
        { model: User, as: 'studentUser', attributes: ['id', 'name', 'examNumber', 'class', 'school'] },
        { model: Answer, as: 'answers', include: [{ model: Question, as: 'question' }] },
      ],
    });
    if (!result) return res.status(404).json({ error: 'Result not found.' });

    const u = req.user;
    if (u.role === 'student') {
      if (result.student !== u.id) return res.status(403).json({ error: 'Not authorised.' });
    } else if (u.school && result.studentUser?.school && u.school !== result.studentUser.school) {
      return res.status(403).json({ error: 'Forbidden — result belongs to another school.' });
    }
    res.json({ result: shapeResult(result) });
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

// PATCH /api/results/:id/answers/:answerId  — teacher marks a (theory) answer
exports.markAnswer = async (req, res, next) => {
  try {
    const { teacherMark, teacherComment } = req.body;
    const answer = await Answer.findByPk(req.params.answerId);
    if (!answer || answer.resultId !== req.params.id) {
      return res.status(404).json({ error: 'Answer not found for this result.' });
    }

    const updates = {};
    if (teacherMark !== undefined && teacherMark !== null && teacherMark !== '') {
      const m = Number(teacherMark);
      updates.teacherMark   = m;
      updates.marksAwarded  = m;          // teacher mark overrides the auto mark
      updates.isCorrect     = m > 0;
      updates.flagged       = false;
    }
    if (teacherComment !== undefined) updates.teacherComment = teacherComment;
    await answer.update(updates);

    // Recompute the result total from all answers' awarded marks.
    const result = await Result.findByPk(req.params.id, {
      include: [
        { model: Answer, as: 'answers' },
        { model: Exam,   as: 'examRecord', attributes: ['totalMarks', 'passMark'] },
      ],
    });
    const totalScore = (result.answers || []).reduce((s, a) => s + (a.marksAwarded || 0), 0);
    const totalMarks = result.examRecord?.totalMarks || 0;
    const percentage = totalMarks ? Math.round((totalScore / totalMarks) * 100) : 0;
    await result.update({
      totalScore,
      percentage,
      passed: totalMarks ? percentage >= (result.examRecord?.passMark || 40) : false,
      grade:  calcGrade(percentage),
      status: result.status === 'released' ? 'released' : 'marked',
    });

    const full = await Result.findByPk(req.params.id, {
      include: [
        { model: Exam, as: 'examRecord', attributes: ['id', 'title', 'subject', 'totalMarks', 'passMark'] },
        { model: User, as: 'studentUser', attributes: ['id', 'name', 'examNumber', 'class', 'school'] },
        { model: Answer, as: 'answers', include: [{ model: Question, as: 'question' }] },
      ],
    });
    res.json({ result: shapeResult(full) });
  } catch (err) { next(err); }
};

// PATCH /api/results/:id/release  — teacher/class teacher releases result
exports.releaseResult = async (req, res, next) => {
  try {
    const { teacherFeedback, teacherComment, classTeacherNote } = req.body;
    const result = await Result.findByPk(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    const updates = { status: 'released', releasedAt: new Date(), releasedBy: req.user.id };
    const fb = teacherFeedback ?? teacherComment; // detail page sends teacherComment
    if (fb !== undefined) updates.teacherFeedback = fb;
    if (classTeacherNote !== undefined) updates.classTeacherNote = classTeacherNote;
    await result.update(updates);
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
