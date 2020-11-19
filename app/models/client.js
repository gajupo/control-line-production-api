'use strict';

const config = require('config');

const {Sequelize, DataTypes, Model} = require('sequelize');
const sequelize = new Sequelize(
    config.get("database.name"),
    config.get("database.user"),
    config.get("database.password"), {
    dialect: 'mssql',
    host: config.get("database.host"),
    port: config.get("database.port")
});

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