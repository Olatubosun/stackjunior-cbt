const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Answer = sequelize.define('Answer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  resultId:       { type: DataTypes.UUID, allowNull: false },
  questionId:     { type: DataTypes.UUID, allowNull: false },
  studentAnswer:  { type: DataTypes.TEXT, allowNull: true },
  isCorrect:      { type: DataTypes.BOOLEAN, allowNull: true },
  marksAwarded:   { type: DataTypes.FLOAT, defaultValue: 0 },
  aiMark:         { type: DataTypes.FLOAT, allowNull: true },
  aiComment:      { type: DataTypes.TEXT, allowNull: true },
  aiConfidence:   {
    type: DataTypes.ENUM('high', 'medium', 'low'),
    allowNull: true,
  },
  teacherMark:    { type: DataTypes.FLOAT, allowNull: true },
  teacherComment: { type: DataTypes.TEXT, allowNull: true },
  flagged:        { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'answers',
});

module.exports = Answer;
