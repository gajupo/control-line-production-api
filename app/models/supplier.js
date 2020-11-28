'use strict';

const {DataTypes} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('Supplier', {
    supplierName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'SupplierName'
    },
    supplierNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'SupplierNumber'
    },
    supplierEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'SupplierEmail'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Status'
    }
}, {
    tableName: 'Supliers',
    timestamps: false,
    sequelize
});
