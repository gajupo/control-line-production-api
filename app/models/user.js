'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class User extends Model {};

User.init({
    userName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'UserName'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Name'
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'FirstName'
    },
    emailAddress: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'EmailAddress'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Password'
    },
    lockCode: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'LockCode'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Status'
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'Status'
    }
}, {
    tableName: 'Users',
    timestamps: false,
    sequelize
});
