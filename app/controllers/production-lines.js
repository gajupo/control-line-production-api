'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { ProductionLine, OperatingStation, Order, Material, Customer } = require('../models');

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

async function getProductionLinesPerCustomer(customerId) {
    try {
        const productionlines = await ProductionLine.findAll({
            include: [{
                model: Order,
                include: [{
                    model: Material,
                    include: [{
                        model: Customer,
                        where: { id: customerId }
                    }]
                }]
            }]
        });
        res.json(productionlines);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomer", error);
        return internalServerError(`Internal server error`, res);
    }   
}

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
