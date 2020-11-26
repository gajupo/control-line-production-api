'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('ProductionLine', {
    lineName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'LineName'
    },
    lineDescription: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'LineDescription'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Status'
    },
    orderType: {
        type: DataTypes.TINYINT,
        allowNull: false,
        field: 'OrderType'
    }
}, {
    tableName: 'ProductionLines',
    timestamps: false,
    sequelize
});
