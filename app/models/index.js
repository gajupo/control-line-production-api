'use strict';

const OperatingStation = require("./operating-station");
const ProductionLine = require("./production-line");
const Order = require("./order");
const Shift = require("./shift");
const Customer = require("./customer");
const UserType = require("./user-type");
const User = require("./user");
const StopCauseLog = require("./stop-cause-log");
const Supplier = require("./supplier");
const Material = require("./material");

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

User.hasMany(StopCauseLog, {
    foreignKey: 'UserId'
});
StopCauseLog.belongsTo(User, {
    foreignKey: 'UserId',
    as: 'User'
});

OperatingStation.hasMany(StopCauseLog, {
    foreignKey: 'StationId'
});
StopCauseLog.belongsTo(OperatingStation, {
    foreignKey: 'StationId'
});

User.hasMany(StopCauseLog, {
    foreignKey: 'ResolverId'
});
StopCauseLog.belongsTo(User, {
    foreignKey: 'ResolverId',
    as: 'Resolver'
});

Order.hasMany(StopCauseLog, {
    foreignKey: 'OrderId'
});
StopCauseLog.belongsTo(Order, {
    foreignKey: 'OrderId'
});

OperatingStation.hasMany(StopCauseLog, {
    foreignKey: 'StationId'
});
StopCauseLog.belongsTo(OperatingStation, {
    foreignKey: 'StationId'
});

Supplier.hasMany(Material, {
    foreignKey: 'SupplierId'
});
Material.belongsTo(Supplier, {
    foreignKey: 'SupplierId'
});

module.exports.Order = Order;
module.exports.ProductionLine = ProductionLine;
module.exports.OperatingStation = OperatingStation;
module.exports.Customer = Customer;
module.exports.UserType = UserType;
module.exports.Shift = Shift;
module.exports.User = User;
module.exports.StopCauseLog = StopCauseLog;
module.exports.Supplier = Supplier;
module.exports.Material = Material;
