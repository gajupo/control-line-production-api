'use strict';

const Joi = require('joi');

module.exports = Joi.object ({
    pasPN: Joi.string().length(8).alphanum(),
    scanDate: Joi.object({
        from: Joi.date().iso().required(),
        to: Joi.date().iso().required()
    })
}).or('pasPN', 'scanDate');
