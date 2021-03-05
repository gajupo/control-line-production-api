'use strict';

const { format } = require('date-fns');
const { logError } = require('../helpers/logger');
const { internalServerError, notFoundError, successfulOperation, badRequestError } = require("./core");
const { Order, Material, Customer, ProductionLine, Shift, validateModelId, 
        validateOrderParameters, StopCauseLog} = require("../models");
const { getProductionLine } = require("./production-lines");
const { getMaterial } = require("./materials");


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
        res.json(orders);
    }
    catch(error) {
        logError("Error in getCurrentOrders", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getCustomerOrders(req, res) {

    try {
        const customer = validateModelId(req.params.id);
        if (!customer.isValid) {
            return badRequestError(`Invalid customer ID: ${customer.id}`, res, customer.errorList);
        }
        const orders = await Order.findAll({
            attributes: ['id', 'orderIdentifier', 'materialScanned', 'orderGoal', 'isIncomplete'],
            include: [{
                model: Material,
                attributes: ['id', 'pasPN'],
                required: true,
                include: [{
                    model: Customer,
                    attributes: ['id', 'customerName'],
                    where: { id: customer.id }
                }]
            }, {
                model: ProductionLine,
                attributes: ['id', 'lineName']
            }, {
                model: Shift,
                attributes: ['id', 'shiftDescription']
            }, {
                model: StopCauseLog,
                required: false,
                attributes: ['id', 'status'],
                where: { status: true }
            }]
        });
        res.json(orders);
    }
    catch(error) {
        logError("Error in getCustomerOrders", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function createNewOrder(req, res, io) {

    try {
        const params = validateOrderParameters(req.body);
        if (!params.isValid) {
            return badRequestError(`The schema is not valid`, res, params.errorList);
        }
        const lineId = req.body.productionLineId;
        const materialId = req.body.materialId;
        const shiftId = req.body.shiftId;
        const goal = req.body.goal;
        const now = new Date();

        const productionLine = await getProductionLine(lineId);
        if (productionLine == null) {
            return notFoundError(`A order with the id ${lineId} was not found`);
        }
        const material = await getMaterial(materialId);
        if (material == null) {
            return notFoundError(`A material with the id ${materialId} was not found`, res);
        }
        const orderIdentifier = generateOrderIdentifier(now, productionLine);

        const order = await Order.create({
            orderIdentifier: orderIdentifier,
            pasPN: material.pasPN,
            materialScanned: 0,
            createdAt: now,
            active: true,
            isIncomplete: true,
            orderGoal: goal,
            stationIdentifier: productionLine.OperatingStation.stationIdentifier,
            ShiftId: shiftId,
            ProductionLineId: lineId,
            MaterialId: materialId
        });
        if (order) {
            // TODO: Optimizar enviando todos los datos requeridos
            const fullOrder = await order.reload({
                include: [{
                    model: Material,
                    attributes: ['id', 'pasPN'],
                    required: true,
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
                }, {
                    model: StopCauseLog,
                    required: false,
                    attributes: ['id', 'status'],
                    where: { status: true }
                }]
            });
            io.emit('order-created', fullOrder);
            return successfulOperation(`The order with the identifier ${orderIdentifier} was created succesfully.`, res, 'order', order);
        }
        return internalServerError(`There was an error saving the new Order`, res);
    }
    catch(error) {
        logError("Error in createNewOrder", error);
        return internalServerError(`Internal server error`, res);
    }
}

function generateOrderIdentifier(dateTime, productionLine) {

    return `${format(dateTime, 'ddMMyyHHmmss')}${productionLine.OperatingStation.stationIdentifier}-${productionLine.OperatingStation.id}`;
}

module.exports.getCurrentOrders = getCurrentOrders;
module.exports.createNewOrder = createNewOrder;
module.exports.getCustomerOrders = getCustomerOrders;
