'use strict';

const {OperatingStation} = require("./operating-station");
const {ProductionLine} = require("./production-line");
const {Order} = require("./order");
const {Shift} = require("./shift");
const {Customer} = require("./customer");

ProductionLine.hasMany(OperatingStation, {
    foreignKey: 'LineId'
});
OperatingStation.belongsTo(ProductionLine, {
    foreignKey: 'LineId'
});

OperatingStation.hasMany(Order, {
    foreignKey: 'OperatingStationId'
});
Order.belongsTo(OperatingStation, {
    foreignKey: 'OperatingStationId'
});

Shift.hasMany(Order, {
    foreignKey: 'ShiftId'
})
Order.belongsTo(Shift, {
    foreignKey: 'ShiftId'
});

module.exports.Order = Order;
module.exports.ProductionLine = ProductionLine;
module.exports.OperatingStation = OperatingStation;
module.exports.Customer = Customer;
