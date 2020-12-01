'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { Order, Material, Customer, ProductionLine, Shift } = require("../models");

async function getCurrentOrders(res, next) {

    try {
        const orders = await Order.findAll({
            attributes: ['id', 'orderIdentifier', 'materialScanned', 'orderGoal', 'isIncomplete'],
            include: [{
                model: Material,
                attributes: ['id', 'pasPN'],
                include: [{
                    model: Customer,
                    attributes: ['id', 'customerName']
                }]
            }, {
                model: ProductionLine,
                attributes: ['id', 'lineName']
            }, {
                model: Shift,
                attributes: ['id', 'shiftDescription']
            }]
        });
        res.send(JSON.stringify(orders, null, 2));
    }
    catch(error) {
        logError("Error in getCurrentOrders", error);
        console.log(error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getCurrentOrders = getCurrentOrders;
