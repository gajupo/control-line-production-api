'use strict';

const { logError, logger, logMessage } = require('../helpers/logger');
const services = require('../services');
const libs = require('../helpers/lib');
const { getDatePartConversion } = require('../helpers/sequelize');
const { internalServerError, badRequestError} = require("./core");
const { utcToZonedTime } = require('date-fns-tz');
const models = require('../models');

async function getProductionLines(res) {
    try {
        const productionlines = services.ProductionLines.getProductionLines();
        res.json(productionlines);
    }
    catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError("Internal server error", res);
    }
}

async function getProductionLine(lineId) {
    try {
        var productionLine = await services.ProductionLines.getProductionLineById(lineId);
        return productionLine;
    } catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError("Internal server error", res);
    }
    
}

async function getProductionLinesPerCustomer(req, res) {
    try {
        const customer = models.validateModelId(req.params.customerId);
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
        const customer = models.validateModelId(req.params.customerId);
        if (!customer.isValid) {
            return badRequestError("Invalid parameter passed", res, customer.errorList);
        }
        var lines = [];
        const productionLines = await services.ProductionLines.getProductionLinesAndShiftsByCustomer(customer.id);
        if(libs.isArray(productionLines))
        {
            for (const entry of productionLines) {
                if(libs.isObject(entry) && !!entry.ShiftId && !!entry.ShiftStartStr && !!entry.ShiftEndStr)
                {
                    let lineResults = await services.ProductionLines.getLineStatsByLineIdAndShift(entry.ProductionLineId, entry.ShiftEndStr, entry.ShiftStartStr,customer.id, entry.ShiftId);
                    if(libs.isArray(lineResults) && lineResults.length > 0)
                        services.ProductionLines.formatProductionLineLiveStats(lines,entry,lineResults);
                    else
                    {
                        logMessage("NO ROWS FOUND", "The Production Line does not have scanned material in the current shift")
                        services.ProductionLines.transformProductionLineDefault(lines,entry);
                    }
                        
                }
                else
                {
                    logError("SHIFT ERROR", "Check the error assigned to the line");
                    logError("Line-Shift Content", entry);
                    services.ProductionLines.transformProductionLineDefault(lines,entry);
                }
                    
            }
        }
        res.json(lines);
    }
    catch (error) {
        logError("Error in getProductionLinesPerCustomerCurrentShift", error);
        return internalServerError("Internal server error", res);
    }
}
module.exports.getProductionLinesPerCustomerCurrentShift = getProductionLinesPerCustomerCurrentShift;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
