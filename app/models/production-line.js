'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

modules.export = sequelize.define('ProductionLine', {
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
        type: DataTypes.TINYINT,
        allowNull: false,
        field: 'Status'
    }
}, {
    tableName: 'ProductionLines',
    timestamps: false,
    sequelize
});
