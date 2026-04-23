const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Result = sequelize.define('Result', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  student:     { type: DataTypes.UUID, allowNull: false },
  exam:        { type: DataTypes.UUID, allowNull: false },
  totalScore:  { type: DataTypes.FLOAT, defaultValue: 0 },
  percentage:  { type: DataTypes.FLOAT, defaultValue: 0 },
  grade:       { type: DataTypes.STRING, allowNull: true },
  passed:      { type: DataTypes.BOOLEAN, allowNull: true },
  timeUsed:    { type: DataTypes.INTEGER, allowNull: true },
  startedAt:   { type: DataTypes.DATE, allowNull: true },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  status: {
    type: DataTypes.ENUM('in_progress', 'submitted', 'marking', 'marked', 'released'),
    defaultValue: 'in_progress',
  },
  // { strengths: [], weaknesses: [], recommendations: [] }
  aiFeedback:       { type: DataTypes.JSON, allowNull: true },
  teacherFeedback:  { type: DataTypes.TEXT, allowNull: true },
  classTeacherNote: { type: DataTypes.TEXT, allowNull: true },
  releasedAt:       { type: DataTypes.DATE, allowNull: true },
  releasedBy:       { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'results',
});

module.exports = Result;
