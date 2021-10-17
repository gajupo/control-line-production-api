const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('StopCause', {
  stopCauseKey: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'StopCauseKey',
    primaryKey: true,
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
  tableName: 'StopCauses',
  timestamps: false,
  sequelize: sequelize,
});
