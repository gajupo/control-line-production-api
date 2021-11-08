const { DataTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');

const OperatingStation = require('./operating-station');
const ProductionLine = require('./production-line');
const Order = require('./order');
const Shift = require('./shift');
const Customer = require('./customer');
const UserType = require('./user-type');
const User = require('./user');
const StopCauseLog = require('./stop-cause-log');
const StopCause = require('./stop-cause');
const Supplier = require('./supplier');
const Material = require('./material');
const ValidationResult = require('./validation-result');
const ProductionLineShiftHistory = require('./production-line-shift-history');

const {
  ReportParameterSchema, validateModelId, validateOrderParameters,
  validateLineParameters, validateLinePerCustomerParameters,
  validateReportParameters, validateLinesAndShifts, validateHourByHourReportParams,
  validateLinesDashboradParams,
} = require('./schemas');

ProductionLine.hasMany(OperatingStation, {
  foreignKey: 'LineId',
});
OperatingStation.belongsTo(ProductionLine, {
  foreignKey: 'LineId',
});

ProductionLine.hasMany(Order, {
  foreignKey: 'ProductionLineId',
});
Order.belongsTo(ProductionLine, {
  foreignKey: 'ProductionLineId',
});

Customer.hasOne(ProductionLine, {
  foreignKey: 'CustomerId',
});
ProductionLine.belongsTo(Customer, {
  foreignKey: 'CustomerId',
});

Shift.hasMany(Order, {
  foreignKey: 'ShiftId',
});
Order.belongsTo(Shift, {
  foreignKey: 'ShiftId',
});

User.hasMany(UserType, {
  foreignKey: 'UserTypeId',
});
UserType.belongsTo(User, {
  foreignKey: 'UserTypeId',
});

User.hasMany(StopCauseLog, {
  foreignKey: 'UserId',
});
StopCauseLog.belongsTo(User, {
  foreignKey: 'UserId',
  as: 'User',
});

OperatingStation.hasMany(StopCauseLog, {
  foreignKey: 'StationId',
});
StopCauseLog.belongsTo(OperatingStation, {
  foreignKey: 'StationId',
});

User.hasMany(StopCauseLog, {
  foreignKey: 'ResolverId',
});
StopCauseLog.belongsTo(User, {
  foreignKey: 'ResolverId',
  as: 'Resolver',
});

Order.hasMany(StopCauseLog, {
  foreignKey: 'OrderId',
});
StopCauseLog.belongsTo(Order, {
  foreignKey: 'OrderId',
});

Supplier.hasMany(Material, {
  foreignKey: 'SupplierId',
});
Material.belongsTo(Supplier, {
  foreignKey: 'SupplierId',
});

Customer.hasMany(ValidationResult, {
  foreignKey: 'CustomerId',
});
ValidationResult.belongsTo(Customer, {
  foreignKey: 'CustomerId',
});

Material.hasMany(ValidationResult, {
  foreignKey: 'MaterialId',
});
ValidationResult.belongsTo(Material, {
  foreignKey: 'MaterialId',
});

OperatingStation.hasMany(ValidationResult, {
  foreignKey: 'StationId',
});
ValidationResult.belongsTo(OperatingStation, {
  foreignKey: 'StationId',
});

User.hasMany(ValidationResult, {
  foreignKey: 'UserId',
});
ValidationResult.belongsTo(User, {
  foreignKey: 'UserId',
});

Order.hasMany(ValidationResult, {
  foreignKey: 'OrderId',
});
ValidationResult.belongsTo(Order, {
  foreignKey: 'OrderId',
});

Customer.hasMany(ProductionLineShiftHistory, {
  foreignKey: 'CustomerId',
});
ProductionLineShiftHistory.belongsTo(Customer, {
  foreignKey: 'CustomerId',
});

ProductionLine.hasMany(ProductionLineShiftHistory, {
  foreignKey: 'ProductionLineId',
});
ProductionLineShiftHistory.belongsTo(ProductionLine, {
  foreignKey: 'ProductionLineId',
});

Shift.hasMany(ProductionLineShiftHistory, {
  foreignKey: 'ShiftId',
});
ProductionLineShiftHistory.belongsTo(Shift, {
  foreignKey: 'ShiftId',
});

const ProductionLineShift = sequelize.define('ProductionLineShifts', {
  shiftId: {
    type: DataTypes.INTEGER,
    field: 'ShiftId',
    references: {
      model: Shift,
      key:
            'Id',
    },
  },
  productionLineId: {
    type: DataTypes.INTEGER,
    field: 'ProductionLineId',
    references: {
      model: ProductionLine,
      key: 'Id',
    },
  },
}, {
  tableName: 'ProductionLineShifts',
  timestamps: false,
  sequelize: sequelize,
});
ProductionLine.belongsToMany(Shift, {
  through: ProductionLineShift,
});
Shift.belongsToMany(ProductionLine, {
  through: ProductionLineShift,
});

StopCause.hasMany(StopCauseLog, {
  foreignKey: 'StopCausesKeys',
});
StopCauseLog.belongsTo(StopCause, {
  foreignKey: 'StopCausesKeys',
});

Material.hasMany(Order, {
  foreignKey: 'MaterialId',
});
Order.belongsTo(Material, {
  foreignKey: 'MaterialId',
});

Customer.hasMany(Material, {
  foreignKey: 'CustomerId',
});
Material.belongsTo(Customer, {
  foreignKey: 'CustomerId',
});

module.exports.Order = Order;
module.exports.ProductionLine = ProductionLine;
module.exports.OperatingStation = OperatingStation;
module.exports.Customer = Customer;
module.exports.UserType = UserType;
module.exports.Shift = Shift;
module.exports.User = User;
module.exports.StopCauseLog = StopCauseLog;
module.exports.StopCause = StopCause;
module.exports.Supplier = Supplier;
module.exports.Material = Material;
module.exports.ValidationResult = ValidationResult;
module.exports.ReportParameterSchema = ReportParameterSchema;
module.exports.validateModelId = validateModelId;
module.exports.validatePaginationPage = validateModelId;
module.exports.validateOrderParameters = validateOrderParameters;
module.exports.validateLineParameters = validateLineParameters;
module.exports.validateLinePerCustomerParameters = validateLinePerCustomerParameters;
module.exports.validateReportParameters = validateReportParameters;
module.exports.validateLinesAndShifts = validateLinesAndShifts;
module.exports.ProductionLineShiftHistory = ProductionLineShiftHistory;
module.exports.validateHourByHourReportParams = validateHourByHourReportParams;
module.exports.validateLinesDashboradParams = validateLinesDashboradParams;
