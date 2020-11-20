'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class OperatingStation extends Model {};

OperatingStation.init({
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

module.exports.OperatingStation = OperatingStation;
