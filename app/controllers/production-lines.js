'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { Sequelize } = require('sequelize');
const { ProductionLine, OperatingStation, validateModelId, Customer,
    ValidationResult } = require('../models');

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
            attributes: [[Sequelize.fn('count', Sequelize.col('ScanDate')), 'total']],
            group: ['ValidationResult.StationId', 'Customer.Id', 'Customer.customerName', 
                'OperatingStation.Id', 'OperatingStation.stationIdentifier',
                'OperatingStation->ProductionLine.id', 'OperatingStation->ProductionLine.lineName'],
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
            }],
            raw: true
        });
        res.json(validationResults);
    } catch (error) {
        logError("Error in getProductionLinesPerCustomer", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
