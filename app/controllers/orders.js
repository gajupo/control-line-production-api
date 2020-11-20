'use strict';

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
        next(error);
    }
}

module.exports.getCurrentOrders = getCurrentOrders;
