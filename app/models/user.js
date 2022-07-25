const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('User', {
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'UserName',
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Name',
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'FirstName',
  },
  emailAddress: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'EmailAddress',
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Password',
  },
  lockCode: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'LockCode',
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'Status',
  },
  userTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UserTypeId',
  },
}, {
  tableName: 'Users',
  timestamps: false,
  sequelize: sequelize,
});
