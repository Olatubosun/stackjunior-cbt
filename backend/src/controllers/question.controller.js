const crypto = require('crypto');
const { Op } = require('sequelize');
const { Question, User } = require('../models');

// Ensure MC/true-false options carry a stable _id and an isCorrect flag — the
// grader matches the chosen option by _id, so AI-generated options (which only
// have a label + correctAnswer) would otherwise never grade correctly.
const ensureOptionIds = (q) => {
  if (!Array.isArray(q.options) || !q.options.length) return q;
  const options = q.options.map((o) => ({
    ...o,
    _id: o._id || crypto.randomUUID(),
    isCorrect: o.isCorrect != null ? o.isCorrect : (!!o.label && o.label === q.correctAnswer),
  }));
  return { ...q, options };
};

// GET /api/questions
exports.getQuestions = async (req, res, next) => {
  try {
    const {
      subject, topic, classLevel, difficulty, type, source,
      page = 1, limit = 20,
    } = req.query;

    const where = { school: req.user.school, isActive: true };
    if (subject)    where.subject    = subject;
    if (topic)      where.topic      = { [Op.like]: `%${topic}%` };
    if (classLevel) where.classLevel = classLevel;
    if (difficulty) where.difficulty = difficulty;
    if (type)       where.type       = type;
    if (source)     where.source     = source;

    const offset = (Number(page) - 1) * Number(limit);

    const { rows: questions, count: total } = await Question.findAndCountAll({
      where,
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      offset,
      limit: Number(limit),
    });

    res.json({
      questions,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) { next(err); }
};

// Map AI/loose type values to the DB enum
const VALID_TYPES = new Set([
  'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'theory', 'essay',
]);
const normaliseType = (t) => {
  if (!t) return 'multiple_choice';
  const k = String(t).toLowerCase().replace(/[\s-]+/g, '_');
  if (VALID_TYPES.has(k)) return k;
  const map = {
    mcq: 'multiple_choice',
    multiplechoice: 'multiple_choice',
    multiple: 'multiple_choice',
    tf: 'true_false',
    truefalse: 'true_false',
    fill_in_the_blank: 'fill_blank',
    fillintheblank: 'fill_blank',
    fillblank: 'fill_blank',
    fill: 'fill_blank',
    short: 'short_answer',
    shortanswer: 'short_answer',
  };
  return map[k.replace(/_/g, '')] || map[k] || 'multiple_choice';
};

const normaliseDifficulty = (d) => {
  const k = String(d || '').toLowerCase();
  return ['easy', 'medium', 'hard'].includes(k) ? k : 'medium';
};

// POST /api/questions/bulk
exports.bulkCreateQuestions = async (req, res, next) => {
  try {
    const list = Array.isArray(req.body?.questions) ? req.body.questions : [];
    if (!list.length) return res.status(400).json({ error: 'No questions provided.' });
    const saved = await Question.bulkCreate(
      list.map(q => ({
        ...ensureOptionIds(q),
        type:       normaliseType(q.type),
        difficulty: normaliseDifficulty(q.difficulty),
        createdBy:  req.user.id,
        school:     req.user.school,
      }))
    );
    res.status(201).json({ saved, count: saved.length });
  } catch (err) { next(err); }
};

// POST /api/questions
exports.createQuestion = async (req, res, next) => {
  try {
    if (!req.body?.questionText || !String(req.body.questionText).trim()) {
      return res.status(400).json({ error: 'Question text is required.' });
    }
    const question = await Question.create({
      ...ensureOptionIds(req.body),
      type:       normaliseType(req.body.type),
      difficulty: normaliseDifficulty(req.body.difficulty),
      createdBy:  req.user.id,
      school:     req.user.school,
    });
    res.status(201).json({ question });
  } catch (err) { next(err); }
};

// GET /api/questions/:id
exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
    });
    if (!question) return res.status(404).json({ error: 'Question not found.' });
    res.json({ question });
  } catch (err) { next(err); }
};

// PUT /api/questions/:id
exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found.' });
    await question.update(req.body);
    res.json({ question });
  } catch (err) { next(err); }
};

// DELETE /api/questions/:id  (soft delete)
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found.' });
    await question.update({ isActive: false });
    res.json({ message: 'Question deleted.' });
  } catch (err) { next(err); }
};
