'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { Sequelize, Op } = require('sequelize');
const { ProductionLine, OperatingStation, validateModelId, Customer,
    ValidationResult, Order, Material, Shift, StopCauseLog } = require('../models');

async function getProductionLines(res) {
    try {
        const productionlines = await ProductionLine.findAll({
            include: [{
                model: OperatingStation,
                attributes: ['id', 'stationIdentifier']
            }],
            attributes: ['id', 'lineName']
        });
        res.json(productionlines);
    }
    catch (error) {
        logError("Error in getProductionLines", error);
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

async function getProductionLinesPerCustomer(req, res) {
    try {
        const customer = validateModelId(req.params.customerId);
        if (!customer.isValid) {
            return badRequestError(`Invalid Customer ID: ${customer.id}`, res, customer.errorList);
        }
        const hours = new Date().getHours();
        const validationResults = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                required: true,
                attributes: ['id', 'customerName'],
                where: { id: customer.id }
            }, {
                model: Shift,
                attributes: ['id', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: false,
                where: {
                    active: true,
                    shiftStart: {
                        [Op.lte]: hours
                    },
                    shiftEnd: {
                        [Op.gte]: hours
                    }
                }
            }, {
                model: OperatingStation,
                attributes: [
                    'id',
                    'stationIdentifier',
                    [Sequelize.fn('count', Sequelize.col('Orders.ValidationResults.Id')), 'validationResultCount']
                ],
                include: [{
                    model: StopCauseLog,
                    required: false,
                    where: { status: true },
                    attributes: ['id']
                }]
            }, {
                model: Order,
                attributes: ['id'],
                required: false,
                include: [{
                    model: Material,
                    attributes: ['id', 'productionRate'],
                    required: false
                }, {
                    model: ValidationResult,
                    attributes: [],
                    required: false
                }]
            }],
            group: ['ProductionLine.id', 'ProductionLine.lineName', 
                'OperatingStations.id','OperatingStations.stationIdentifier',
                'OperatingStations.StopCauseLogs.id', 'Orders.Material.id',
                'Orders.Material.productionRate', 'Orders.id', 'Customer.id',
                'Customer.customerName', 'Shifts.id', 'Shifts.shiftStart', 'Shifts.shiftEnd'],
        });
        const result = transformValidationResult(validationResults);
        res.json(result);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomer", error);
        return internalServerError(`Internal server error`, res);
    }
}

function transformValidationResult(validationResults) {
    var productionLines = [];

    validationResults.forEach((validation) => {
        consolidateValidationResult(productionLines, validation.dataValues);
    });
    return productionLines;
}

function consolidateValidationResult(productionLines, validationResult) {
    const line = validationResult;
    if (line.hasOwnProperty('OperatingStations')) {
        const customer = line.Customer;
        const stations = line.OperatingStations;
        let validationResultCount = 0;
        let goal = 0;

        const active = checkIfLineIsActive(line);
        if (active) {
            const shiftHours = getHoursPerShift(line);
            goal = getProductionGoal(line, shiftHours);
            validationResultCount = getValidationResultCount(stations);
        }
        productionLines.push( {
            id: line.id,
            lineName: line.lineName,
            active: active,
            blocked: checkIfLineIsBlocked(stations),
            customerId: customer.id,
            customerName: customer.customerName,
            validationResultCount: validationResultCount,
            goal: goal,
            rate: getProductionRate(validationResultCount, goal)
        });
    }
}

function getHoursPerShift(line) {
    if (line.hasOwnProperty('Shifts') && line.Shifts.length > 0) {
        const shift = line.Shifts[0];
        return Math.ceil(shift.shiftEnd - shift.shiftStart);
    }
    return 0;
}

function getProductionGoal(line, shiftHours) {
    let goal = 0;
    if (line.hasOwnProperty('Orders')) {
        const orders = line.Orders;
        orders.forEach(order => {
            const material = order.Material;
            const orderGoal = shiftHours * material.productionRate;

            goal += orderGoal;
        });
    }
    return goal;
}

function getValidationResultCount(stations) {
    let count = 0;
    stations.forEach(station => {
        count += station.dataValues.validationResultCount;
    });
    return count;
}

function checkIfLineIsActive(line) {
    if (line.hasOwnProperty('Orders')) {
        const orders = line.Orders;
        return orders.length > 0;
    }
    return false;
}

function getProductionRate(validationResultCount, productionRate) {
    if (productionRate == 0) {
        return 0;
    }
    return Math.ceil((validationResultCount / productionRate) * 100);
}

function checkIfLineIsBlocked(stations) {
    return stations.every(station => station.StopCauseLogs.length > 0);
}


module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
