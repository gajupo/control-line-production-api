const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('SectionTypes', {
    sectionTypeName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'SectionTypeName',
  },
}, {
  tableName: 'SectionTypes',
  timestamps: false,
  sequelize: sequelize,
});