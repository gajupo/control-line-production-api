'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class ProductionLine extends Model {};

Model.init({
    lineName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lineDescription: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.TINYINT,
        allowNull: false
    }
}, {
    tableName: 'ProductionLines',
    timestamps: false,
    sequelize
});

module.exports.ProductionLine = ProductionLine;
