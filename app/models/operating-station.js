'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

module.exports = sequelize.define('OperatingStation', {
    stationIdentifier: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'StationIdentifier'
    },
    status : {
        type: DataTypes.TINYINT,
        allowNull: false,
        field: 'Status'
    }
}, {
    tableName: 'OperatingStations',
    timestamps: false,
    sequelize
});
