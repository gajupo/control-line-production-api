const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('ProductionLineShiftHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'Id',
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'CustomerId',
  },
  productionLineId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ProductionLineId',
  },
  shiftId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ShiftId',
  },
  shiftStartDateTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'ShiftStartDateTime',
  },
  shiftEndDateTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ShiftEndDateTime',
  },
}, {
  tableName: 'ProductionLineShiftHistories',
  timestamps: false,
  sequelize: sequelize,
});
