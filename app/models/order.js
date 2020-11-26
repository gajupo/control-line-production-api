'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('Order', {
    orderIdentifier: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'OrderIdentifier'
    },
    pasPN: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'PasPN',
        primaryKey: true
    },
    materialScanned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'MaterialScanned'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'CreatedAt'
    },
    active: {
        type: DataTypes.TINYINT,
        allowNull: true,
        field: 'Active'
    },
    isIncomplete: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'IsIncomplete'
    },
    orderGoal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'OrderGoal'
    },
    stationIdentifier: {
        type: DataTypes.STRING,
        allowNull:true,
        field: 'StationIdentifier'
    }
}, {
    tableName: 'Orders',
    timestamps: false,
    sequelize
});
