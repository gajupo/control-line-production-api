'use strict';

const {DataTypes, Model, TINYINT} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class Order extends Model {}

Order.init({
    orderIdentifier: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pasPN: {
        type: DataTypes.STRING,
        allowNull: true
    },
    materialScanned: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    active: {
        type: DataTypes.TINYINT,
        allowNull: true
    },
    isIncomplete: {
        type: DataTypes.BOOLEAN,
        allowNull: true
    },
    orderGoal: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
}, {
    tableName: 'Orders',
    timestamps: false,
    sequelize
});

module.exports.Order = Order;
