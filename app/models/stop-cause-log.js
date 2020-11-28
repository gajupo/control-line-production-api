'use strict';

const {DataTypes} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('StopCauseLog', {
    createdDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'CreatedDate'
    },
    solutionDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'SolutionDate'
    },
    stopComments: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'StopComments'
    },
    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'Status'
    },
    stopCausesKeys: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'StopCausesKeys',
        references: {
            model: 'StopCause',
            key: 'StopCauseKey'
        }
    },
    notificationSent: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'NotificationSent'
    },
    barcode: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'Barcode'
    },
}, {
    tableName: 'StopCauseLogs',
    timestamps: false,
    sequelize
});
