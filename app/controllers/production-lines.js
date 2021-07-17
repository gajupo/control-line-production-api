'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError, badRequestError } = require("./core");
const { Sequelize, Op } = require('sequelize');
const { parseISO } = require('date-fns');
const { ProductionLine, OperatingStation, validateLinePerCustomerParameters,
    validateLineParameters, Customer, ValidationResult, Order, Material, Shift,
    StopCauseLog, validateModelId } = require('../models');

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
        const params = validateLinePerCustomerParameters(req.params, req.body);
        if (!params.isValid) {
            return badRequestError("Invalid parameters passed", res, params.errorList);
        }
        const today = parseISO(params.productionDate);
        const productionLines = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                required: true,
                attributes: ['id', 'customerName'],
                where: { id: params.customerId }
            }, {
                model: Shift,
                attributes: ['id', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: false,
                where: {
                    active: true,
                    shiftStart: {
                        [Op.lte]: today.getHours()
                    },
                    shiftEnd: {
                        [Op.gte]: today.getHours()
                    }
                }
            }, {
                model: OperatingStation,
                attributes: [
                    'id',
                    'stationIdentifier',
                    [Sequelize.fn('count', Sequelize.col('OperatingStations.ValidationResults.Id')), 'validationResultCount']
                ],
                include: [{
                    model: StopCauseLog,
                    required: false,
                    where: { status: true },
                    attributes: ['id']
                }, {
                    model: ValidationResult,
                    attributes: [],
                    required: false,
                    where: Sequelize.where(getDatePartConversion('OperatingStations.ValidationResults.ScanDate'), '=', today)
                }]
            }, {
                model: Order,
                attributes: ['id'],
                required: false,
                include: [{
                    model: Material,
                    attributes: ['id', 'productionRate'],
                    required: false
                }],
                where: {
                    [Op.and]: [
                        Sequelize.where(Sequelize.col('Orders.Active'), '=', true),
                        Sequelize.where(getDatePartConversion('Orders.CreatedAt'), '=', today)
                    ]
                }
            }],

            group: ['ProductionLine.id', 'ProductionLine.lineName', 
                'OperatingStations.id','OperatingStations.stationIdentifier',
                'OperatingStations.StopCauseLogs.id', 'Orders.Material.id',
                'Orders.Material.productionRate', 'Orders.id', 'Customer.id',
                'Customer.customerName', 'Shifts.id', 'Shifts.shiftStart', 'Shifts.shiftEnd'],
        });
        const result = transformProductionLines(productionLines);
        res.json(result);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomer", error);
        return internalServerError(`Internal server error`, res);
    }
}

function transformProductionLines(productionLines) {
    var lines = [];

    productionLines.forEach((line) => {
        transformProductionLine(lines, line.dataValues);
    });
    return lines;
}

function transformProductionLine(productionLines, line) {
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
    let hasOrders = false, hasShifts = false;
    if (line.hasOwnProperty('Orders')) {
        const orders = line.Orders;
        hasOrders = orders.length > 0;
    }
    if (line.hasOwnProperty('Shifts')) {
        const shifts = line.Shifts;
        hasShifts = shifts.length > 0;
    }
    return hasOrders && hasShifts;
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

function getDatePartConversion(column) {
    return Sequelize.fn('CONVERT', Sequelize.literal('date'), Sequelize.col(`${column}`));
}


async function getProductionLine(req, res) {
    try {
        const line = validateLineParameters(req.params, req.body);
        if (!line.isValid) {
            return badRequestError("Invalid parameters passed", res, line.errorList);
        }
        const today = parseISO(line.productionDate);
        var productionLine = await ProductionLine.findOne({
            where: { id: line.id },
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                attributes: ['id', 'customerName'],
                required: true
            }, {
                model: Shift,
                attributes: ['id', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: false,
                where: {
                    active: true,
                    shiftStart: {
                        [Op.lte]: today.getHours()
                    },
                    shiftEnd: {
                        [Op.gte]: today.getHours()
                    }
                }
            }]
        });
        res.json(productionLine);
    }
    catch (error) {
        logError("Error in getProductionLine", error);
        return internalServerError(`Internal server error`, res);  
    }
}

async function getProductionLines(req, res) {
    try {
        const customer = validateModelId(req.params.customerId);
        if (!customer.isValid) {
            return badRequestError("Invalid parameter", res, customer.errorList);
        }
        const productionlines = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                required: true,
                attributes: [],
                where: { id: customer.id }
            }]
        });
        res.json(productionlines);
    }
    catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError(`Internal server error`, res);
    }
}


module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
