'use strict';

const {OperatingStation} = require("./operating-station");
const {ProductionLine} = require("./production-line");
const {Order} = require("./order");
const {Shift} = require("./shift");
const {Customer} = require("./customer");

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

module.exports.Order = Order;
module.exports.ProductionLine = ProductionLine;
module.exports.OperatingStation = OperatingStation;
module.exports.Customer = Customer;
