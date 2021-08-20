'use strict';

const Joi = require('joi');

const PageParameterSchema = Joi.object ({
    page: Joi.number().integer().positive().required()
});

const OrderParameterSchema = Joi.object ({
    productionLineId: Joi.number().integer().positive().required(),
    materialId: Joi.number().integer().positive().required(),
    shiftId: Joi.number().integer().positive().required(),
    goal: Joi.number().integer().positive().required()
});

const LinePerCustomerParameterSchema = Joi.object({
    customerId: Joi.number().integer().positive().required(),
    productionDate: Joi.date().iso().required()
});

const LineParameterSchema = Joi.object({
    lineId: Joi.number().integer().positive().required(),
    productionDate: Joi.date().iso().required()
});

const ReportParameterSchema = Joi.object ({
    pasPN: Joi.string().min(8).alphanum(),
    scanDate: Joi.object({
        from: Joi.date().iso().required(),
        to: Joi.date().iso().required()
    })
}).or('pasPN', 'scanDate');

function addMessageErrorIfNotValid(returned, error) {
    if (error) {
        returned.isValid = false;
        returned.errorList = error.details.map(e => e.message);
    }
}

/**
 * Validates that the given id is  a number, integer and positive.
 * 
 * Returns and object with the property isValid and a errorList array.
 * If the ID is invalid, isValid returns false, and the errorList
 * contains the error message.
 */
module.exports.validateModelId = function validateModelId(id) {
    
    var returned = {
        isValid: true,
        errorList: [],
        id: id
    };
    const {error} = PageParameterSchema.validate({ page: id });
    addMessageErrorIfNotValid(returned, error);
    return returned;
}

/**
 * Validates that the given payload parameter is a valid order payload
 * and that its fields are valid too.
 * 
 * Returns and object with the property isValid and a errorList array.
 * If the ID is invalid, isValid returns false, and the errorList
 * contains the error message.
 */
module.exports.validateOrderParameters = function validateOrderParameters(payload) {

    var returned = {
        isValid: true,
        errorList: []
    };
    const {error} = OrderParameterSchema.validate({
        productionLineId: payload.productionLineId,
        materialId: payload.materialId,
        shiftId: payload.shiftId,
        goal: payload.goal
    });
    addMessageErrorIfNotValid(returned, error);
    return returned;
}

module.exports.validateLinePerCustomerParameters = function validateLinePerCustomerParameters(params, body) {
    var returned = {
        customerId: params.customerId,
        productionDate: body.productionDate,
        isValid: true,
        errorList: []
    };
    const {error} = LinePerCustomerParameterSchema.validate({
        customerId: params.customerId,
        productionDate: body.productionDate
    });
    addMessageErrorIfNotValid(returned, error);
    return returned;
}

module.exports.validateLineParameters = function validateLineParameters(params, body) {
    var returned = {
        lineId: params.lineId,
        productionDate: body.productionDate,
        isValid: true,
        errorList: []
    };
    const {error} = LineParameterSchema.validate({
        lineId: params.lineId,
        productionDate: body.productionDate
    });
    addMessageErrorIfNotValid(returned, error);
    return returned;
}

module.exports.validateReportParameters = function validateReportParameters(body) {
    const {error} = ReportParameterSchema.validate(body);
    var returned = {
        ...body,
        isValid: true,
        errorList: []
    };
    addMessageErrorIfNotValid(returned, error);
    return returned;
}
