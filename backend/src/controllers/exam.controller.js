const { Op } = require('sequelize');
const { Exam, Question, User, Class, Result } = require('../models');

// Single source of truth for "exams a student can sit right now": approved /
// released (published or active) AND inside the open window (open date passed,
// not yet closed), scoped to the student's school and — when known — class.
// Shared by the dashboard list (getExams) and the readiness feed
// (getReadyExams) so the two can never disagree.
const studentReadyWhere = (user) => {
  const now = new Date();
  const where = {
    school: user.school,
    status: { [Op.in]: ['published', 'active'] },
    [Op.and]: [
      { [Op.or]: [{ scheduledStart: null }, { scheduledStart: { [Op.lte]: now } }] },
      { [Op.or]: [{ scheduledEnd:   null }, { scheduledEnd:   { [Op.gte]: now } }] },
    ],
  };
  if (user.classId) where.classId = user.classId;
  return where;
};

exports.getExams = async (req, res, next) => {
  try {
    let where = {};
    const include = [
      { model: User,     as: 'creator',     attributes: ['id', 'name'] },
      { model: Class,    as: 'classRecord', attributes: ['id', 'name'] },
      { model: Question, as: 'questions',   attributes: ['id'], through: { attributes: [] } },
    ];

    if (req.user.role === 'student') {
      // Students: only exams they can sit now, strictly scoped to their class.
      if (!req.user.school || !req.user.classId) {
        return res.json({ exams: [], count: 0 });
      }
      where = studentReadyWhere(req.user);
    } else {
      // Teachers / admins: their school's exams
      if (req.user.school) where.school = req.user.school;
    }

    const exams = await Exam.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
    });
    res.json({ exams, count: exams.length });
  } catch (err) { next(err); }
};

/**
 * Ready exams for the current user — the feed behind the student "plan" card.
 *
 * An exam is "ready" when it is approved/released (status published or active)
 * AND currently inside its open window: the open date has passed (scheduledStart
 * null or <= now) and it has not closed (scheduledEnd null or >= now).
 *
 * Students are scoped to their school and, when known, their class. Staff get
 * their school's ready exams (no class filter) so they can preview.
 *
 * Returns { exams, subjects, count } where `subjects` is the distinct subject
 * list the card headlines and each exam carries a `questionCount` and (for
 * students) an `attempted` flag.
 */
exports.getReadyExams = async (req, res, next) => {
  try {
    const u = req.user;
    if (!u.school) return res.json({ exams: [], subjects: [], count: 0 });
    // Students must be in a class; they only ever see their own class's exams.
    if (u.role === 'student' && !u.classId) return res.json({ exams: [], subjects: [], count: 0 });
    const where = studentReadyWhere(u);

    const exams = await Exam.findAll({
      where,
      include: [
        { model: Class,    as: 'classRecord', attributes: ['id', 'name'] },
        { model: Question, as: 'questions',   attributes: ['id'], through: { attributes: [] } },
      ],
      order: [['scheduledStart', 'ASC'], ['createdAt', 'DESC']],
    });

    // Which of these the student has already sat (submitted or beyond).
    let attempted = new Set();
    if (u.role === 'student' && exams.length) {
      const results = await Result.findAll({
        attributes: ['exam'],
        where: {
          student: u.id,
          exam:    { [Op.in]: exams.map(e => e.id) },
          status:  { [Op.in]: ['submitted', 'marking', 'marked', 'released'] },
        },
      });
      attempted = new Set(results.map(r => r.exam));
    }

    const shaped = exams.map(e => ({
      id:             e.id,
      title:          e.title,
      subject:        e.subject,
      classLevel:     e.classLevel,
      className:      e.classRecord?.name || null,
      mode:           e.mode,
      duration:       e.duration,
      totalMarks:     e.totalMarks,
      passMark:       e.passMark,
      questionCount:  (e.questions || []).length,
      scheduledStart: e.scheduledStart,
      scheduledEnd:   e.scheduledEnd,
      attempted:      attempted.has(e.id),
    }));

    const subjects = [...new Set(shaped.map(e => e.subject))].sort();
    // Don't cache — readiness changes as exams are scheduled/opened/closed.
    res.set('Cache-Control', 'no-store');
    res.json({ exams: shaped, subjects, count: shaped.length });
  } catch (err) { next(err); }
};

exports.createExam = async (req, res, next) => {
  try {
    const { questions: questionIds, classId, ...examData } = req.body;

    if (!req.user.school) {
      return res.status(400).json({
        error: 'You must be linked to a school before creating exams. Log in via Stackjunior.',
      });
    }
    if (!classId) {
      return res.status(400).json({ error: 'classId is required.' });
    }
    // Verify the class belongs to the admin's school
    const cls = await Class.findOne({ where: { id: classId, schoolId: req.user.school } });
    if (!cls) {
      return res.status(403).json({ error: 'That class does not belong to your school.' });
    }

    const exam = await Exam.create({
      ...examData,
      classId,
      classLevel: examData.classLevel || cls.name,
      createdBy:  req.user.id,
      school:     req.user.school,
    });
    if (Array.isArray(questionIds) && questionIds.length) {
      await exam.setQuestions(questionIds);
    }
    const withQs = await Exam.findByPk(exam.id, {
      include: [
        { model: Question, as: 'questions' },
        { model: Class,    as: 'classRecord', attributes: ['id', 'name'] },
      ],
    });
    res.status(201).json({ exam: withQs });
  } catch (err) { next(err); }
};

exports.getExam = async (req, res, next) => {
  try {
    // Access already enforced by middleware; req.exam is loaded but without questions.
    const exam = await Exam.findByPk(req.exam.id, {
      include: [
        { model: Question, as: 'questions' },
        { model: Class,    as: 'classRecord', attributes: ['id', 'name'] },
      ],
    });

    if (req.user.role === 'student') {
      let qs = exam.questions || [];
      if (exam.randomiseQuestions) {
        qs = [...qs].sort(() => Math.random() - 0.5);
      }
      const safe = qs.map(q => ({
        id:           q.id,
        type:         q.type,
        questionText: q.questionText,
        options:      (q.options || []).map(o => ({ _id: o._id, text: o.text, label: o.label })),
        markingGuide: { maxMarks: q.markingGuide?.maxMarks },
      }));
      return res.json({ exam: { ...exam.toJSON(), questions: safe } });
    }
    res.json({ exam });
  } catch (err) { next(err); }
};

exports.updateExam = async (req, res, next) => {
  try {
    const { questions: questionIds, classId, ...examData } = req.body;
    const exam = req.exam; // loaded + access-checked by middleware

    if (classId && classId !== exam.classId) {
      const cls = await Class.findOne({ where: { id: classId, schoolId: req.user.school } });
      if (!cls) return res.status(403).json({ error: 'That class does not belong to your school.' });
      examData.classId    = classId;
      examData.classLevel = examData.classLevel || cls.name;
    }

    await exam.update(examData);
    if (Array.isArray(questionIds)) {
      await exam.setQuestions(questionIds);
    }
    const updated = await Exam.findByPk(exam.id, {
      include: [
        { model: Question, as: 'questions' },
        { model: Class,    as: 'classRecord', attributes: ['id', 'name'] },
      ],
    });
    res.json({ exam: updated });
  } catch (err) { next(err); }
};

exports.publishExam = async (req, res, next) => {
  try {
    const updates = { status: 'published' };
    const n = parseInt(req.body?.attemptsAllowed, 10);
    if (Number.isInteger(n) && n >= 1) updates.attemptsAllowed = n;
    await req.exam.update(updates);
    res.json({ exam: req.exam, message: 'Exam published.' });
  } catch (err) { next(err); }
};
