const Joi = require('joi');

const PageParameterSchema = Joi.object({
  page: Joi.number().integer().positive().required(),
});

const OrderParameterSchema = Joi.object({
  productionLineId: Joi.number().integer().positive().required(),
  materialId: Joi.number().integer().positive().required(),
  shiftId: Joi.number().integer().positive().required(),
  goal: Joi.number().integer().positive().required(),
});

const LinePerCustomerParameterSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  productionDate: Joi.date().iso().required(),
});

const LineParameterSchema = Joi.object({
  lineId: Joi.number().integer().positive().required(),
  productionDate: Joi.date().iso().required(),
});

const ReportParameterSchema = Joi.object({
  pasPN: Joi.string().min(8).alphanum(),
  scanDate: Joi.object({
    from: Joi.date().iso().required(),
    to: Joi.date().iso().required(),
  }),
}).or('pasPN', 'scanDate');
const ProductionLinesAndShiftsByCustomerSchema = Joi.array().items(Joi.object({
  ShiftDescription: Joi.string().required(),
  ShiftStartStr: Joi.string().required(),
  ShiftEndStr: Joi.string().required(),
  ProductionLineId: Joi.number().integer().positive().required(),
  ShiftId: Joi.number().integer().positive().required(),
  Active: Joi.number().optional(),
  LineName: Joi.string().optional(),
  CustomerId: Joi.number().optional(),
  CustomerName: Joi.string().optional(),
  NumberOfStations: Joi.number().optional(),
  isBlocked: Joi.number().integer().required(),
  ShiftStartedDateTime: Joi.date().required(),
  ShiftEndDateTime: Joi.date().required(),
})).min(1);
const ReportHourByHourSchema = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  date: Joi.date().iso().required(),
  productionLineId: Joi.number().integer().positive().required(),
  // eslint-disable-next-line no-useless-escape
  shiftEnd: Joi.string().regex(/^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/),
  // eslint-disable-next-line no-useless-escape
  shiftStart: Joi.string().regex(/^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/),
  shiftId: Joi.number().integer().positive().required(),
});
const LineDashboardParamsSchema = Joi.object({
  CustomerId: Joi.number().integer().positive().required(),
  ProductionLineId: Joi.number().integer().positive().required(),
  ShiftId: Joi.number().integer().positive().required(),
  ShiftStartedDateTime: Joi.date().required(),
  ShiftEndDateTime: Joi.date().required(),
  // eslint-disable-next-line no-useless-escape
  ShiftStartStr: Joi.string().regex(/^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/),
  // eslint-disable-next-line no-useless-escape
  ShiftEndStr: Joi.string().regex(/^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/),
});
function addMessageErrorIfNotValid(returned, error) {
  if (error) {
    const objReturned = returned;
    objReturned.isValid = false;
    objReturned.errorList = error.details.map((e) => e.message);
  }
}
/**
 ** Validates that the given body parameters are valid
 ** customerId, productionLineId, shiftId is a number, integer and positive,
 ** shiftEnd and shiftStart have valid time formar,
 ** date is iso valid date time
 * @param {*} bodyParams
 */
module.exports.validateHourByHourReportParams = (bodyParams) => {
  const returned = {
    isValid: true,
    errorList: [],
  };
  const { error } = ReportHourByHourSchema.validate(bodyParams);
  addMessageErrorIfNotValid(returned, error);
  return returned;
};
/**
 * Validates that the given id is  a number, integer and positive.
 * Returns and object with the property isValid and a errorList array.
 * If the ID is invalid, isValid returns false, and the errorList
 * contains the error message.
 */
module.exports.validateModelId = function validateModelId(id) {
  const returned = {
    isValid: true,
    errorList: [],
    id: id,
  };
  const { error } = PageParameterSchema.validate({ page: id });
  addMessageErrorIfNotValid(returned, error);
  return returned;
};

/**
 * Validates that the given payload parameter is a valid order payload
 * and that its fields are valid too.
 * Returns and object with the property isValid and a errorList array.
 * If the ID is invalid, isValid returns false, and the errorList
 * contains the error message.
 */
module.exports.validateOrderParameters = function validateOrderParameters(payload) {
  const returned = {
    isValid: true,
    errorList: [],
  };
  const { error } = OrderParameterSchema.validate({
    productionLineId: payload.productionLineId,
    materialId: payload.materialId,
    shiftId: payload.shiftId,
    goal: payload.goal,
  });
  addMessageErrorIfNotValid(returned, error);
  return returned;
};

module.exports.validateLinePerCustomerParameters = function validateLinePerCustomerParameters(params, body) {
  const returned = {
    customerId: params.customerId,
    productionDate: body.productionDate,
    isValid: true,
    errorList: [],
  };
  const { error } = LinePerCustomerParameterSchema.validate({
    customerId: params.customerId,
    productionDate: body.productionDate,
  });
  addMessageErrorIfNotValid(returned, error);
  return returned;
};

module.exports.validateLineParameters = function validateLineParameters(params, body) {
  const returned = {
    lineId: params.lineId,
    productionDate: body.productionDate,
    isValid: true,
    errorList: [],
  };
  const { error } = LineParameterSchema.validate({
    lineId: params.lineId,
    productionDate: body.productionDate,
  });
  addMessageErrorIfNotValid(returned, error);
  return returned;
};

module.exports.validateReportParameters = function validateReportParameters(body) {
  const { error } = ReportParameterSchema.validate(body);
  const returned = {
    ...body,
    isValid: true,
    errorList: [],
  };
  addMessageErrorIfNotValid(returned, error);
  return returned;
};
/**
 * Validates that the given query result with lines and its shift are correct according the schema
 * Every line must have a valid shift and all field are requiered
 * @param {*} queryResult
 * @returns
 */
module.exports.validateLinesAndShifts = function validateLinesAndShifts(queryResult) {
  const returned = {
    isValid: true,
    errorList: [],
  };
  const { error } = ProductionLinesAndShiftsByCustomerSchema.validate(queryResult);
  addMessageErrorIfNotValid(returned, error);
  return returned;
};
/**
 * Validates if the query string params passed to query the line dashboard data are valid
 * @param {*} reqParams
 * @returns Object
 * @example
 *{
    isValid: true || false,
    errorList: [],
  };
 */
module.exports.validateLinesDashboradParams = function validateLinesDashboradParams(reqParams) {
  const returned = {
    isValid: true,
    errorList: [],
  };
  const { error } = LineDashboardParamsSchema.validate(reqParams);
  addMessageErrorIfNotValid(returned, error);
  return returned;
};
