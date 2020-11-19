'use strict';

const {Customer} = require("../models/customer");

async function getCustomerList(res, next) {

    try {
        const customers = await Customer.findAll( {
            attributes: ['id', 'customerNumber', 'customerName']
        });
        res.send(JSON.stringify(customers, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getCustomerList = getCustomerList;
