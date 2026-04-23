const { Op } = require('sequelize');
const { Exam, Question, User, Class } = require('../models');

exports.getExams = async (req, res, next) => {
  try {
    const where = {};
    const include = [
      { model: User,  as: 'creator',     attributes: ['id', 'name'] },
      { model: Class, as: 'classRecord', attributes: ['id', 'name'] },
    ];

    if (req.user.role === 'student') {
      // Students: strictly scoped to their school; class filter applied only
      // when the student has a classId (falls back to school-wide otherwise)
      if (!req.user.school) {
        return res.json({ exams: [], count: 0 });
      }
      where.school = req.user.school;
      if (req.user.classId) where.classId = req.user.classId;
      where.status = { [Op.in]: ['active', 'closed'] };
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
    await req.exam.update({ status: 'published' });
    res.json({ exam: req.exam, message: 'Exam published.' });
  } catch (err) { next(err); }
};
