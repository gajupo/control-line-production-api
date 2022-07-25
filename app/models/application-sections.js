const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('ApplicationSections', {
  sectionName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'SectionName',
  },
  sectionTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'SectionTypeId',
  },
}, {
  tableName: 'ApplicationSections',
  timestamps: false,
  sequelize: sequelize,
});
