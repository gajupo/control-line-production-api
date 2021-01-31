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
