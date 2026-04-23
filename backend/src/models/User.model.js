const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name:     { type: DataTypes.STRING, allowNull: false },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    set(value) {
      this.setDataValue('username', value ? String(value).toLowerCase() : null);
    },
  },
  email:    {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    // Internal unique identifier — may be synthesized (e.g. `username@cbt.local`)
    // for Stackjunior users who don't have a real email. No strict isEmail check.
    set(value) {
      if (value == null) { this.setDataValue('email', null); return; }
      this.setDataValue('email', String(value).toLowerCase().trim());
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [6, 255] },
  },
  role: {
    type: DataTypes.ENUM(
      'super_admin', 'school_admin', 'exam_officer',
      'subject_teacher', 'class_teacher', 'student'
    ),
    allowNull: false,
  },
  school:     { type: DataTypes.UUID, allowNull: true },   // FK → schools.id
  classId:    { type: DataTypes.UUID, allowNull: true },   // FK → classes.id
  class:      { type: DataTypes.STRING, allowNull: true }, // textual label (legacy / display)
  subjects:   { type: DataTypes.JSON, allowNull: true },
  examNumber: { type: DataTypes.STRING, allowNull: true },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
  },
});

User.prototype.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = User;
