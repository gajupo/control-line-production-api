'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { Order, OperatingStation, ProductionLine } = require("../models");

async function getCurrentOrders(res, next) {

    try {
        const orders = await Order.findAll({
            include: [{
                model: OperatingStation,
                include: [{
                    model: ProductionLine
                }]
            }]
        });
        res.send(JSON.stringify(orders, null, 2));
    }
    catch(error) {
        logError("Error in getCurrentOrders", error);
        return internalServerError(`Internal server error`);
    }
}

module.exports.getCurrentOrders = getCurrentOrders;
