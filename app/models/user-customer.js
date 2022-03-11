const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

module.exports = sequelize.define('UserCustomer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id',
    },
    customerId: {
        type: DataTypes.INTEGER,
        field: 'CustomerId',
    },
    productionLineId: {
        type: DataTypes.INTEGER,
        field: 'ProductionLineId',
    },
    userId: {
        type: DataTypes.INTEGER,
        field: 'UserId',
    }
}, {
  tableName: 'UserCustomers',
  timestamps: false,
  sequelize: sequelize,
});