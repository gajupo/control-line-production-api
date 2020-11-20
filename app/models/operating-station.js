'use strict';

const {DataTypes, Model} = require('sequelize');
const {sequelize} = require("../helpers/sequelize");

class OperatingStation extends Model {};

OperatingStation.init({
    stationIdentifier: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status : {
        type: DataTypes.TINYINT,
        allowNull: false
    }
}, {
    tableName: 'OperatingStations',
    timestamps: false,
    sequelize
});

module.exports.OperatingStation = OperatingStation;
