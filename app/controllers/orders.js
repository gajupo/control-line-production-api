'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError, notFoundError } = require("./core");
const { Order, Material, Customer, ProductionLine, Shift, OperatingStation, ProductionLineShift } = require("../models");

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
        var now = new Date();

        const productionLine = await getProductionLine(lineId);
        if (productionLine == null) {
            return notFoundError(`A order with the id ${lineId} was not found`);
        }
        const material = await getMaterial(materialId);
        if (material == null) {
            return notFoundError(`A material with the id ${materialId} was not found`);
        }
        const shift = await getCurrentShift(now, productionLine);
        if (shift == null) {
            return notFoundError(`A shift for the ProductionLine with the id ${productionLine.id} was not found`);
        }
        res.send(JSON.stringify({ productionLine: productionLine, material: material, shift: shift }, null, 2));
    }
    catch(error) {
        console.log(error);
        logError("Error in createNewOrder", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getProductionLine(lineId) {
    
    var productionLine = await ProductionLine.findOne({
        where: { id: lineId },
        include: [{
            model: OperatingStation,
            attributes: ['id', 'stationIdentifier']
        }],
        attributes: ['id']
    });
    return productionLine;
}

async function getMaterial(materialId) {

    var material = await Material.findOne({
        where: { id: materialId },
        attributes: ['id', 'pasPN']
    });
    return material;
}

async function getCurrentShift(dateTime, productionLine) {

    const fractionalHours = dateTime.getHours() + (dateTime.getMinutes() / 60);
    const shifts = await Shift.findAll({
        through: {
            where: { productionLineId: productionLine.id },
            attributes: []
        },
        attributes: ['id', 'shiftStart', 'shiftEnd']
    });
    const shift = shifts.find(s => fractionalHours >= s.shiftStart && fractionalHours <= s.shiftEnd);
    return shift;
}

module.exports.getCurrentOrders = getCurrentOrders;
module.exports.createNewOrder = createNewOrder;
