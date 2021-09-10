'use strict';

const {DataTypes} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('Shift', {
    shiftDescription: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ShiftDescription'
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'Active'
    },
    shiftStart: {
        type: DataTypes.REAL,
        allowNull: false,
        field: 'ShiftStart'
    },
    shiftEnd: {
        type: DataTypes.REAL,
        allowNull: false,
        field: 'ShiftEnd'
    }
    ,
    shiftStartStr: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ShiftStartStr'
    }
    ,
    shiftEndStr: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'ShiftEndStr'
    }
}, {
    tableName: 'Shifts',
    timestamps: false,
    sequelize
});
