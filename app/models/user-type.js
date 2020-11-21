'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class UserType extends Model {};

UserType.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Name'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Description'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Status'
    }
}, {
    tableName: 'UserTypes',
    timestamps: false,
    sequelize
});
