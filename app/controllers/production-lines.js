'use strict';

const { logError } = require('../helpers/logger');
const services = require('../services');
const libs = require('../helpers/lib');
const { getDatePartConversion } = require('../helpers/sequelize');
const { internalServerError, badRequestError, getHoursPerShift, 
    getProductionGoal, getProductionRate } = require("./core");
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { utcToZonedTime } = require('date-fns-tz');
const { ProductionLine, OperatingStation, Customer, ValidationResult, Order, 
    Material, Shift, validateModelId, StopCauseLog } = require('../models');

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
        return internalServerError("Internal server error", res);
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
            return badRequestError("Invalid parameter passed", res, customer.errorList);
        }
        const productionLines = await services.ProductionLines.getProductionLinesPerCustomer(customer.id);
        res.json(productionLines);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomer", error);
        return internalServerError("Internal server error", res);
    }
}

async function getProductionLinesPerCustomerCurrentShift(req, res) {
    try {
        const customer = validateModelId(req.params.customerId);
        if (!customer.isValid) {
            return badRequestError("Invalid parameter passed", res, customer.errorList);
        }
        const today = utcToZonedTime(new Date(), "America/Mexico_City");
        let linesValidationResultStats = [];
        var lines = [];
        const productionLines = await services.ProductionLines.getProductionLinesAndShiftsByCustomer(customer.id);
        if(libs.isArray(productionLines))
        {
            for (const entry of productionLines) {
                if(libs.isObject(entry))
                {
                    let lineResults = await services.ProductionLines.getLineStatsByLineIdAndShift(entry.ProductionLineId,entry.ShiftStartStr, entry.ShiftEndStr);
                    if(libs.isArray(lineResults) && lineResults.length > 0)
                        services.ProductionLines.transformProductionLine(lines,entry,lineResults);
                    else
                        services.ProductionLines.transformProductionLineDefault(lines,entry);
                }
            }
        }

                  
        // const productionLinesAux = await ProductionLine.findAll({
        //     attributes: ['id', 'lineName'],
        //     include: [{
        //         model: Customer,
        //         required: true,
        //         attributes: ['id', 'customerName'],
        //         where: { id: customer.id }
        //     }, {
        //         model: Shift,
        //         attributes: ['id', 'shiftStart', 'shiftEnd'],
        //         through: { attributes: [] },
        //         required: false,
        //         where: {
        //             active: true,
        //             shiftStart: {
        //                 [Op.lte]: today.getHours()
        //             },
        //             shiftEnd: {
        //                 [Op.gte]: today.getHours()
        //             }
        //         }
        //     }, {
        //         model: OperatingStation,
        //         attributes: [
        //             'id',
        //             'stationIdentifier',
        //             [Sequelize.fn('count', Sequelize.col('OperatingStations.ValidationResults.Id')), 'validationResultCount']
        //         ],
        //         include: [{
        //             model: StopCauseLog,
        //             required: false,
        //             where: { status: true },
        //             attributes: ['id']
        //         }, {
        //             model: ValidationResult,
        //             attributes: [],
        //             required: false,
        //             where: Sequelize.where(getDatePartConversion('OperatingStations.ValidationResults.ScanDate'), '=', today)
        //         }]
        //     }, {
        //         model: Order,
        //         attributes: ['id'],
        //         required: false,
        //         include: [{
        //             model: Material,
        //             attributes: ['id', 'productionRate'],
        //             required: false
        //         }],
        //         where: {
        //             [Op.and]: [
        //                 Sequelize.where(Sequelize.col('Orders.IsIncomplete'), '=', true),
        //                 Sequelize.where(getDatePartConversion('Orders.CreatedAt'), '=', today)
        //             ]
        //         }
        //     }],
        //     group: ['ProductionLine.id', 'ProductionLine.lineName', 
        //         'OperatingStations.id','OperatingStations.stationIdentifier',
        //         'OperatingStations.StopCauseLogs.id', 'Orders.Material.id',
        //         'Orders.Material.productionRate', 'Orders.id', 'Customer.id',
        //         'Customer.customerName', 'Shifts.id', 'Shifts.shiftStart', 'Shifts.shiftEnd'],
        // });

        // const result = transformProductionLines(linesValidationResultStats);
        res.json(lines);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomerCurrentShift", error);
        return internalServerError("Internal server error", res);
    }
}

function transformProductionLines(linesValidationResultStats) {
    var lines = [];

    for (const lineResultInfo of linesValidationResultStats) {
        transformProductionLine(lines, lineResultInfo);
    }
    productionLines.forEach((line) => {
        transformProductionLine(lines, line.dataValues);
    });
    return lines;
}

function transformProductionLine(productionLines, lineResultInfo) {
    if (libs.isArray(lineResultInfo)) {
        const customer = this.line.CustomerName;
        const stations = line.OperatingStations;
        let validationResultCount = 0;
        let goal = 0;
        let active = false;

        if (checkIfLineHasShifts(line)) {
            active = true;
            if (checkIfLineHasOrders(line)) {
                const shiftHours = getHoursPerShift(line);
                goal = getProductionGoal(line, shiftHours);
            }
        }
        validationResultCount = getValidationResultCount(stations);
        console.log(checkIfLineIsBlocked(stations));
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

function getValidationResultCount(stations) {
    let count = 0;
    stations.forEach(station => {
        count += station.dataValues.validationResultCount;
    });
    return count;
}

function checkIfLineHasOrders(line) {
    if ("Orders" in line) {
        const orders = line.Orders;
        return orders.length > 0;
    }
    return false;
}

function checkIfLineHasShifts(line) {
    if ("Shifts" in line) {
        const shifts = line.Shifts;
        return shifts.length > 0;
    }
    return false;
}

function checkIfLineIsBlocked(stations) {
    return stations.every(station => station.StopCauseLogs.length > 0) > 0;
}

module.exports.getProductionLinesPerCustomerCurrentShift = getProductionLinesPerCustomerCurrentShift;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
