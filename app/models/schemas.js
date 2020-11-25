'use strict';

const Joi = require('@hapi/joi');

const reportParameterSchema = Joi.object ({
    pasPN: Joi.string().length(8).alphanum(),
    scanDate: Joi.object({
        from: Joi.date().iso().required(),
        to: Joi.date().iso().required()
    })
}).or('pasPN', 'scanDate');

module.exports.reportParameterSchema = reportParameterSchema;
