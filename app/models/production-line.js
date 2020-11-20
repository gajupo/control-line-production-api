'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class ProductionLine extends Model {};

Model.init({
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

module.exports.ProductionLine = ProductionLine;
