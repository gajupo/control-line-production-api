'use strict';

const { Order, OperatingStation } = require("../models");

async function getCurrentOrders(res, next) {

    try {
        const orders = await Order.findAll({ include: OperatingStation});
        res.send(JSON.stringify(orders, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getCurrentOrders = getCurrentOrders;
