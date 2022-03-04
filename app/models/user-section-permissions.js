const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('UserSectionPermissions', {
  userTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UserTypeId',
  },
  applicationSectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ApplicationSectionId',
  },
  active: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'Active',
  },
}, {
  tableName: 'UserSectionPermissions',
  timestamps: false,
  sequelize: sequelize,
});