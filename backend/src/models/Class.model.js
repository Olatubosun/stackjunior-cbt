const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClassModel = sequelize.define('Class', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name:       { type: DataTypes.STRING, allowNull: false }, // e.g. "JSS 1A"
  schoolId:   { type: DataTypes.UUID, allowNull: false },
  // External ID from Stackjunior; unique per school
  externalId: { type: DataTypes.STRING, allowNull: true },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'classes',
  indexes: [
    { unique: true, fields: ['schoolId', 'externalId'], name: 'classes_school_external_unique' },
    { unique: true, fields: ['schoolId', 'name'],       name: 'classes_school_name_unique' },
  ],
});

module.exports = ClassModel;
