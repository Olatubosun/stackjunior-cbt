const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subject:    { type: DataTypes.STRING, allowNull: false },
  topic:      { type: DataTypes.STRING, allowNull: false },
  classLevel: { type: DataTypes.STRING, allowNull: false },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium',
  },
  type: {
    type: DataTypes.ENUM(
      'multiple_choice', 'true_false', 'fill_blank',
      'short_answer', 'theory', 'essay'
    ),
    allowNull: false,
  },
  questionText: { type: DataTypes.TEXT, allowNull: false },
  // options: [{ _id, text, isCorrect }] — stored as JSON
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  correctAnswer: { type: DataTypes.TEXT, allowNull: true },
  explanation:   { type: DataTypes.TEXT, allowNull: true },
  // markingGuide: { modelAnswer, keyPoints, keywords, maxMarks, ... }
  markingGuide: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: { maxMarks: 1, strictness: 'moderate', partialMarks: true },
  },
  source: {
    type: DataTypes.ENUM('manual', 'ai_generated', 'scanned', 'uploaded', 'external_exam'),
    defaultValue: 'manual',
  },
  externalExam: { type: DataTypes.STRING, allowNull: true },
  createdBy:    { type: DataTypes.UUID, allowNull: true },
  school:       { type: DataTypes.UUID, allowNull: true },
  usageCount:   { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive:     { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'questions',
});

module.exports = Question;
