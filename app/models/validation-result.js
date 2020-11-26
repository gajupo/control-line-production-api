'use strict';

const {DataTypes} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('ValidationResult', {
    barcodeScanned: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'BarcodeScanned'
    },
    barcodeMapping : {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'BarcodeMapping'
    },
    scanDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'ScanDate'
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Active'
    },
    duplicated: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Duplicated'
    },
    uniqueValue: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'UniqueValue'
    },
    uniqueValueIdentity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'UniqueValueIdentity'
    },
    orderIdentifier: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'OrderIdentifier'
    }
});
