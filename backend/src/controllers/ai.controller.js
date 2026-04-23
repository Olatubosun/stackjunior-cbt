const aiService = require('../services/ai.service');
const { Question } = require('../models');

exports.generateFromPrompt = async (req, res, next) => {
  try {
    const questions = await aiService.generateQuestionsFromPrompt(req.body);
    res.json({ questions });
  } catch (err) { next(err); }
};

exports.generateFromContent = async (req, res, next) => {
  try {
    // Accept either { content } or { text } from the frontend
    const body = { ...req.body, content: req.body.content ?? req.body.text };
    const questions = await aiService.generateQuestionsFromContent(body);
    res.json({ questions });
  } catch (err) { next(err); }
};

exports.saveGeneratedQuestions = async (req, res, next) => {
  try {
    const { questions, subject, topic, classLevel, difficulty } = req.body;
    const saved = await Question.bulkCreate(
      questions.map(q => ({
        ...q, subject, topic, classLevel, difficulty,
        source:    'ai_generated',
        createdBy: req.user.id,
        school:    req.user.school,
      }))
    );
    res.status(201).json({ saved, count: saved.length });
  } catch (err) { next(err); }
};

exports.markTheory = async (req, res, next) => {
  try {
    const { questionText, studentAnswer, markingGuide } = req.body;
    const result = await aiService.markTheoryAnswer({ questionText, studentAnswer, markingGuide });
    res.json({ result });
  } catch (err) { next(err); }
};

exports.getFeedback = async (req, res, next) => {
  try {
    const feedback = await aiService.generateFeedback(req.body);
    res.json({ feedback });
  } catch (err) { next(err); }
};
