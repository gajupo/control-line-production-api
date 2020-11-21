'use strict';

const OperatingStation = require("./operating-station");
const ProductionLine = require("./production-line");
const Order = require("./order");
const Shift = require("./shift");
const Customer = require("./customer");
const  UserType = require("./user-type");
const  User = require("./user");
const  StopCauseLog = require("./stop-cause-log");

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

User.hasMany(UserType, {
    foreignKey: 'UserTypeId'
});
UserType.belongsTo(User, {
    foreignKey: 'UserTypeId'
});

module.exports.Order = Order;
module.exports.ProductionLine = ProductionLine;
module.exports.OperatingStation = OperatingStation;
module.exports.Customer = Customer;
module.exports.UserType = UserType;
module.exports.Shift = Shift;
module.exports.User = User;
module.exports.StopCauseLog = StopCauseLog;
