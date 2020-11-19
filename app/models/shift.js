'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class Shift extends Model {}

Shift.init({
    shiftDescription: {
        type: DataTypes.STRING,
        allowNull: false
    },
    shiftStart: {
        type: DataTypes.DATE,
        allowNull: false
    },
    shiftEnd: {
        type: DataTypes.DATE,
        allowNull: false
    },
    active: {
        type: DataTypes.TINYINT,
        allowNull: false
    }
}, {
    tableName: 'Shifts',
    timestamps: false,
    sequelize
});

module.exports.Shift = Shift;
