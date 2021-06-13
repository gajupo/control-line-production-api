'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { ProductionLine, OperatingStation, Order, Material, Customer,
    validateModelId, Shift} = require('../models');

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
        const productionlines = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Order,
                attributes: ['id', 'pasPN', 'materialScanned', 'createdAt'],
                required: true,
                include: [{
                    model: Material,
                    required: true,
                    attributes: ['id', 'pasPN', 'productionRate'],
                    include: [{
                        model: Customer,
                        required: true,
                        attributes: ['id', 'customerName'],
                        where: { id: customer.id }
                    }]
                }, {
                    model: Shift,
                    attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                    required: true
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
