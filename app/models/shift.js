'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class Shift extends Model {}

Shift.init({
    shiftDescription: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'shiftDescription'
    },
    shiftStart: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'ShiftStart'
    },
    shiftEnd: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'ShiftEnd'
    },
    active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        field: 'Active'
    }
}, {
    tableName: 'Shifts',
    timestamps: false,
    sequelize
});

module.exports.Shift = Shift;
