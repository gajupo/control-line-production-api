'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError, notFoundError } = require("./core");
const { Order, Material, Customer, ProductionLine, Shift, OperatingStation } = require("../models");

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
        return internalServerError(`Internal server error`, res);
    }
}

async function createNewOrder(lineId, materialId, res) {
    
    try {
        const productionLine = await getProductionLine(lineId);
        if (productionLine == null) {
            return notFoundError(`A order with the id ${lineId} was not found`);
        }
        const material = await getMaterial(materialId);
        if (material == null) {
            return notFoundError(`A material with the id ${materialId} was not found`);
        }
    }
    catch(error) {
        logError("Error in createNewOrder", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getProductionLine(lineId) {
    
    var productionLine = await ProductionLine.findOne({
        where: { id: lineId },
        include: [{
            model: OperatingStation,
            attributes: ['id']
        }],
        attributes: ['id', 'stationIdentifier']
    });
    return productionLine;
}

async function getMaterial(materialId) {
    var material = await Material.findOne({
        where: { id: materialId },
        attributes: ['id', 'pasPAN']
    });
    return material;
}

module.exports.getCurrentOrders = getCurrentOrders;
module.exports.createNewOrder = createNewOrder;
