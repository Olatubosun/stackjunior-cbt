const { sequelize } = require('../config/database');

const User       = require('./User.model');
const Question   = require('./Question.model');
const Exam       = require('./Exam.model');
const Result     = require('./Result.model');
const Answer     = require('./Answer.model');
const School     = require('./School.model');
const ClassModel = require('./Class.model');

// ── Associations ───────────────────────────────────────────────

// School ↔ Classes
School.hasMany(ClassModel, { foreignKey: 'schoolId', as: 'classes' });
ClassModel.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });

// School ↔ Users / Exams
School.hasMany(User, { foreignKey: 'school', as: 'members' });
User.belongsTo(School, { foreignKey: 'school', as: 'schoolRecord' });

School.hasMany(Exam, { foreignKey: 'school', as: 'exams' });
Exam.belongsTo(School, { foreignKey: 'school', as: 'schoolRecord' });

// Class ↔ Users / Exams
ClassModel.hasMany(User, { foreignKey: 'classId', as: 'students' });
User.belongsTo(ClassModel, { foreignKey: 'classId', as: 'classRecord' });

ClassModel.hasMany(Exam, { foreignKey: 'classId', as: 'exams' });
Exam.belongsTo(ClassModel, { foreignKey: 'classId', as: 'classRecord' });

// User → Questions / Exams / Results (creator)
User.hasMany(Question, { foreignKey: 'createdBy', as: 'createdQuestions' });
Question.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Exam, { foreignKey: 'createdBy', as: 'createdExams' });
Exam.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(Result, { foreignKey: 'student', as: 'results' });
Result.belongsTo(User, { foreignKey: 'student', as: 'studentUser' });

// Exam → Result
Exam.hasMany(Result, { foreignKey: 'exam', as: 'results' });
Result.belongsTo(Exam, { foreignKey: 'exam', as: 'examRecord' });

// Exam ↔ Question (many-to-many via exam_questions)
Exam.belongsToMany(Question, {
  through: 'exam_questions',
  foreignKey: 'examId',
  otherKey:   'questionId',
  as: 'questions',
});
Question.belongsToMany(Exam, {
  through: 'exam_questions',
  foreignKey: 'questionId',
  otherKey:   'examId',
  as: 'exams',
});

// Result → Answers
Result.hasMany(Answer, { foreignKey: 'resultId', as: 'answers', onDelete: 'CASCADE' });
Answer.belongsTo(Result, { foreignKey: 'resultId' });

// Question → Answers
Question.hasMany(Answer, { foreignKey: 'questionId', as: 'answers' });
Answer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

module.exports = {
  sequelize,
  User, Question, Exam, Result, Answer,
  School, Class: ClassModel,
};
