'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { Sequelize } = require('sequelize');
const { ProductionLine, OperatingStation, validateModelId, Customer,
    ValidationResult, Order, StopCauseLog, Material, Shift } = require('../models');

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
        const validationResults = await ValidationResult.findAll({
            attributes: [[Sequelize.fn('count', Sequelize.col('ScanDate')), 'validationResultCount']],
            group: ['Customer.Id', 'Customer.customerName',
                'OperatingStation.id', 'OperatingStation.stationIdentifier',
                'OperatingStation->ProductionLine.id', 'OperatingStation->ProductionLine.lineName',
                'Order.id', 'Order.orderIdentifier', 'Order->Shift.id',
                'Order->Material.id', 'Order->Material.pasPN', 'Order->Material.productionRate',
                'Order->Shift.shiftDescription', 'Order->Shift.shiftStart', 'Order->Shift.shiftEnd'],
            include: [{
                model: Customer,
                required: true,
                attributes: ['id', 'customerName'],
                where: { id: customer.id }
            }, {
                model: OperatingStation,
                required: true,
                attributes: ['id', 'stationIdentifier'],
                include: [{
                    model: ProductionLine,
                    required: true,
                    attributes: ['id', 'lineName']
                }]
            }, {
                model: Order,
                required: true,
                attributes: ['id', 'orderIdentifier'],
                include: [{
                    model: Shift,
                    required: true,
                    attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                }, {
                    model: Material,
                    required: true,
                    attributes: ['id', 'pasPN', 'productionRate'],
                }]
            }]
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
    if (validationResult.hasOwnProperty('OperatingStation')) {
        const station = validationResult.OperatingStation;
        if (station.hasOwnProperty('ProductionLine')) {
            const line = productionLines.find(element => {
                return element.id == station.ProductionLine.id;
            });
            const material = validationResult.Order.Material;
            const shift = validationResult.Order.Shift;
            const productionRate = material.productionRate * getHoursPerShift(shift);
            if (line == null) {
                productionLines.push( {
                    id: station.ProductionLine.id,
                    lineName: station.ProductionLine.lineName,
                    validationResultCount: validationResult.validationResultCount,
                    goal: productionRate,
                    rate: Math.ceil((validationResult.validationResultCount / productionRate) * 100),
                    operatingStations: [{
                        id: station.id,
                        stationIdentifier: station.stationIdentifier
                    }]
                } );
            }
            else {
                line.validationResultCount += validationResult.validationResultCount;
                if (line.hasOwnProperty('operatingStations')) {
                    if (!line.operatingStations.some((element) => element.id == station.id)) {
                        line.operatingStations.push({
                            id: station.id,
                            stationIdentifier: station.stationIdentifier
                        });
                    }
                }
                if (line.hasOwnProperty('goal')) {
                    line.goal += productionRate;
                }
                if (line.hasOwnProperty('rate')) {
                    line.rate = Math.ceil((line.validationResultCount / line.goal) * 100);
                }
            }
        }
    }
}

function getHoursPerShift(shift) {
    if (shift === undefined) {
        return 0;
    }
    return Math.ceil(shift.shiftEnd - shift.shiftStart);
}


module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
