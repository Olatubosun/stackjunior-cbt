const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const School = sequelize.define('School', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name:       { type: DataTypes.STRING, allowNull: false },
  // External ID from Stackjunior, used for upsert
  externalId: { type: DataTypes.STRING, allowNull: true, unique: true },
  address:    { type: DataTypes.STRING, allowNull: true },
  isActive:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'schools',
});

module.exports = School;
