'use strict';

const { format } = require('date-fns');
const { logError } = require('../helpers/logger');
const { internalServerError, notFoundError, successfulOperation, badRequestError } = require("./core");
const { Order, Material, Customer, ProductionLine, Shift, OrderParameterSchema, PageParameterSchema } = require("../models");
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
        const {error} = PageParameterSchema.validate({ page: req.params.id });
        if (error) {
            const errorList = error.details.map(e => e.message);
            return badRequestError(`The customer ID ${req.params.id} is not valid`, res, errorList);
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
                    where: { id: req.params.id }
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
        logError("Error in getCustomerOrders", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function createNewOrder(req, res) {
    
    try {
        const params = validateOrderParameters(req.body);
        if (!params.isValid) {
            return badRequestError(`The schema is not valid`, res, params.errorList);
        }
        const lineId = req.body.productionLineId;
        const materialId = req.body.materialId;
        const now = new Date();

        const productionLine = await getProductionLine(lineId);
        if (productionLine == null) {
            return notFoundError(`A order with the id ${lineId} was not found`);
        }
        const material = await getMaterial(materialId);
        if (material == null) {
            return notFoundError(`A material with the id ${materialId} was not found`, res);
        }
        const shift = await getCurrentShift(now, productionLine);
        if (shift == null) {
            return notFoundError(`A shift for the ProductionLine with the id ${productionLine.id} was not found`, res);
        }
        const orderIdentifier = generateOrderIdentifier(now, productionLine);

        const order = await Order.create({
            orderIdentifier: orderIdentifier,
            pasPN: material.pasPN,
            materialScanned: 0,
            createdAt: now,
            active: true,
            isIncomplete: true,
            orderGoal: 0,
            stationIdentifier: productionLine.OperatingStation.stationIdentifier,
            ShiftId: shift.id,
            ProductionLineId: productionLine.id,
            MaterialId: materialId
        });
        if (order) {
            return successfulOperation(`The order with the identifier ${orderIdentifier} was created succesfully.`, res, 'order', order);
        }
        return internalServerError(`There was an error saving the new Order`, res);
    }
    catch(error) {
        console.log(error);
        logError("Error in createNewOrder", error);
        return internalServerError(`Internal server error`, res);
    }
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

function generateOrderIdentifier(dateTime, productionLine) {

    return `${format(dateTime, 'ddMMyyHHmmss')}${productionLine.OperatingStation.stationIdentifier}-${productionLine.OperatingStation.id}`;
}

function validateOrderParameters(payload) {

    var returned = {
        isValid: true,
        errorList: []
    };
    const {error} = OrderParameterSchema.validate({
        productionLineId: payload.productionLineId,
        materialId: payload.materialId,
        shift: payload.shiftId,
        goal: payload.goal
    });
    if (error) {
        returned.isValid = false;
        returned.errorList = error.details.map(e => e.message);
    }
    return returned;
}

module.exports.getCurrentOrders = getCurrentOrders;
module.exports.createNewOrder = createNewOrder;
module.exports.getCustomerOrders = getCustomerOrders;
