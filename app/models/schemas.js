'use strict';

const Joi = require('joi');

module.exports.ReportParameterSchema = Joi.object ({
    pasPN: Joi.string().min(8).alphanum(),
    scanDate: Joi.object({
        from: Joi.date().iso().required(),
        to: Joi.date().iso().required()
    })
}).or('pasPN', 'scanDate');

module.exports.PageParameterSchema = Joi.object ({
    page: Joi.number().integer().positive().required()
});

module.exports.OrderParameterSchema = Joi.object ({
    productionLineId: Joi.number().integer().positive().required(),
    materialId: Joi.number().integer().positive().required(),
    shiftId: Joi.number().integer().positive().required(),
    goal: Joi.number().integer().positive().required()
});

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
        errorList: []
    };
    const {error} = PageParameterSchema.validate({ page: id });
    if (error) {
        returned.isValid = false;
        returned.errorList = error.details.map(e => e.message);
    }
    return returned;
}
