'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('Material', {
    partNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'PartNumber'
    },
    pasPN : {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'PasPN'
    },
    materialDescription: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'MaterialDescription'
    },
    spBoxValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'SpBoxValue'
    },
    spSkidValue: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'SpSkidValue'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Status'
    }
});
