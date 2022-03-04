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
const UserCustomer = require('./user-customer');
const UserSectionPermissions = require('./user-section-permissions');
const ApplicationSections = require('./application-sections');
const SectionTypes = require('./section-types');

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

Customer.hasMany(ProductionLine, {
  as: 'lineas',
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

Customer.hasMany(UserCustomer, {
  foreignKey: 'CustomerId',
});
ProductionLine.hasMany(UserCustomer, {
  foreignKey: 'ProductionLineId',
});
User.hasMany(UserCustomer, {
  foreignKey: 'UserId',
});

UserCustomer.belongsTo(Customer, {foreignKey: 'CustomerId'}); // Adds fk_CustomerId to UserCustomer
UserCustomer.belongsTo(ProductionLine, {as: 'lineas',foreignKey: 'ProductionLineId'}); // Adds fk_ProductionLineId to UserCustomer
UserCustomer.belongsTo(User, {foreignKey: 'UserId'}); // Adds fk_UserId to UserCustomer

SectionTypes.hasMany(ApplicationSections, {
  foreignKey: 'SectionTypeId',
});

ApplicationSections.hasMany(UserSectionPermissions,{
  foreignKey: 'ApplicationSectionId',
});

UserType.hasMany(UserSectionPermissions,{
  foreignKey: 'UserTypeId',
});

ApplicationSections.belongsTo(SectionTypes, {foreignKey: 'SectionTypeId'}); // Adds fk_CustomerId to UserCustomer
UserSectionPermissions.belongsTo(ApplicationSections, {foreignKey: 'ApplicationSectionId'}); // Adds fk_ProductionLineId to UserCustomer
UserSectionPermissions.belongsTo(UserType, {foreignKey: 'UserTypeId'}); // Adds fk_UserId to UserCustomer

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
module.exports.UserCustomer = UserCustomer;
module.exports.UserSectionPermissions = UserSectionPermissions;
module.exports.ApplicationSections = ApplicationSections;
module.exports.SectionTypes = SectionTypes;
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