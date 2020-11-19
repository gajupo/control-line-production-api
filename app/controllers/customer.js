'use strict';

const {Customer} = require("../models/customer");

async function getCustomerList(req, res) {

    const customers = Customer.findAll();

    res.send(JSON.stringify(customers, null, 2));
}

module.exports.getCustomerList = getCustomerList;
