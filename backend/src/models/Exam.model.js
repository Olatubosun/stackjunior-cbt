const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title:        { type: DataTypes.STRING, allowNull: false },
  subject:      { type: DataTypes.STRING, allowNull: false },
  classLevel:   { type: DataTypes.STRING, allowNull: false },
  instructions: { type: DataTypes.TEXT, allowNull: true },
  duration:     { type: DataTypes.INTEGER, allowNull: false },
  totalMarks:   { type: DataTypes.INTEGER, allowNull: false },
  passMark:     { type: DataTypes.INTEGER, defaultValue: 40 },
  mode: {
    type: DataTypes.ENUM('practice', 'exam'),
    defaultValue: 'exam',
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'active', 'closed'),
    defaultValue: 'draft',
  },
  scheduledStart:     { type: DataTypes.DATE, allowNull: true },
  scheduledEnd:       { type: DataTypes.DATE, allowNull: true },
  negativeMarking:    { type: DataTypes.BOOLEAN, defaultValue: false },
  randomiseQuestions: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy:          { type: DataTypes.UUID, allowNull: true },
  school:             { type: DataTypes.UUID, allowNull: true }, // FK → schools.id
  classId:            { type: DataTypes.UUID, allowNull: true }, // FK → classes.id
}, {
  tableName: 'exams',
});

module.exports = Exam;
