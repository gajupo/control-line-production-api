'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define({
    shiftDescription: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'ShiftDescription'
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
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Active'
    }
}, {
    tableName: 'Shifts',
    timestamps: false,
    sequelize
});
