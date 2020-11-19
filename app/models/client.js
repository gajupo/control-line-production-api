'use strict';

const config = require('config');
const {sequelize} = require("../helpers/sequelize");

class Cliente extends Model {}

Cliente.init({
    customerNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'CustomerNumber'
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'CustomerName'
    },
    customerAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'CustomerAddress'
    },
    customerEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'CustomerEmail'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'Status'
    },
    prnTemplate: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'PrnTemplate'
        
    },
    zplData: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ZplData'
    },
    prnVarMappings: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'PrnVarMappings'
    },
    currentTemplate: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'CurrentTemplate'
    },
    templateStored: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'TemplateStored'
    }
}, {
    tableName: 'Customers',
    sequelize
});

module.exports.Customer = Cliente;