'use strict';

const { logError } = require('../helpers/logger');
const { Customer } = require("../models");
const { internalServerError } = require("./core");

async function getCustomerList(res, next) {

    try {
        const customers = await Customer.findAll( {
            attributes: ['id', 'customerNumber', 'customerName']
        });
        res.json(customers);
    }
    catch(error) {
        logError("Error in getCustomerList", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getCustomerList = getCustomerList;
