const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('UserType', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Name',
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Description',
  },
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    field: 'Status',
  },
}, {
  tableName: 'UserTypes',
  timestamps: false,
  sequelize: sequelize,
});
