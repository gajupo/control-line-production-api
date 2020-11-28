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
const ValidationResult = require("./validation-result");

const {ReportParameterSchema} = require("./schemas");
const {PageParameterSchema} = require("./schemas");

ProductionLine.hasMany(OperatingStation, {
    foreignKey: 'LineId'
});
OperatingStation.belongsTo(ProductionLine, {
    foreignKey: 'LineId'
});

ProductionLine.hasMany(Order, {
    foreignKey: 'ProductionLineId'
});
Order.belongsTo(ProductionLine, {
    foreignKey: 'ProductionLineId'
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

Customer.hasMany(ValidationResult, {
    foreignKey: 'CustomerId'
});
ValidationResult.belongsTo(Customer, {
    foreignKey: 'CustomerId'
});

Material.hasMany(ValidationResult, {
    foreignKey: 'MaterialId'
});
ValidationResult.belongsTo(Material, {
    foreignKey: 'MaterialId'
});

OperatingStation.hasMany(ValidationResult, {
    foreignKey: 'StationId'
});
ValidationResult.belongsTo(OperatingStation, {
    foreignKey: 'StationId'
});

User.hasMany(ValidationResult, {
    foreignKey: 'UserId'
});
ValidationResult.belongsTo(User, {
    foreignKey: 'UserId'
});

OperatingStation.belongsToMany(Shift, {
    through: 'ProductionLineShifts'
});
Shift.belongsToMany(OperatingStation, {
    through: 'ProductionLineShifts'
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
module.exports.ValidationResult = ValidationResult;
module.exports.ReportParameterSchema = ReportParameterSchema;
module.exports.PageParameterSchema = PageParameterSchema;
