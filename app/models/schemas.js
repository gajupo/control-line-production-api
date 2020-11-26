'use strict';

const Joi = require('joi');

module.exports = Joi.object ({
    orderIdentifier: Joi.string().length(20).alphanum(),
    scanDate: Joi.object({
        from: Joi.date().iso().required(),
        to: Joi.date().iso().required()
    })
}).or('orderIdentifier', 'scanDate');
