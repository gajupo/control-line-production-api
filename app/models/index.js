'use strict';

const {OperatingStation} = require("./operating-station");
const {ProductionLine} = require("./production-line");
const {Order} = require("./order");
const {Shift} = require("./shift");

ProductionLine.hasMany(OperatingStation, {
    foreignKey: 'lineId'
});
OperatingStation.belongsTo(ProductionLine);

OperatingStation.hasMany(Order, {
    foreignKey: 'operatingStationId'
});
Order.belongsTo(OperatingStation);

Shift.hasMany(Order, {
    foreignKey: 'shiftId'
})
Order.belongsTo(Shift);
