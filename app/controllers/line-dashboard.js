'use strict';

const { utcToZonedTime } = require('date-fns-tz');
const { logError } = require('../helpers/logger');
const { getDatePartConversion } = require('../helpers/sequelize');
const { internalServerError, badRequestError, getHoursPerShift, 
    getProductionGoal, getProductionRate } = require("./core");
const { Sequelize, Op } = require('sequelize');
const { ProductionLine, OperatingStation, Customer, ValidationResult,
    Shift, StopCauseLog, validateModelId, Order, Material } = require('../models');
const services = require('../services');

    
async function getProductionLine(req, res) {
    try {
        const line = validateModelId(req.params.lineId);
        if (!line.isValid) {
            return badRequestError("Invalid parameter passed to getProductionLineImpl", res, line.errorList);
        }
        const today = utcToZonedTime("2021-07-21 19:21:05.217", "America/Mexico_City");
        const productionLine = await getProductionLineImpl(line);
        const compliance = await services.ValidationResults.getProductionComplianceImpl(line, today);
        productionLine.compliance = compliance;

        res.json(productionLine);
    }
    catch (error) {
        logError("Error in getProductionLine", error);
        return internalServerError(`Internal server error`, res);  
    }
}

async function getProductionLineImpl(line) {
    const today = utcToZonedTime("2021-07-21 19:21:05.217", "America/Mexico_City");
    const lineImpl = await services.ProductionLines.getProductionLineImpl(line, today);
    return transformLine(lineImpl);
}

function transformLine(productionLine) {
    var line = {
        id: productionLine.id,
        lineName: productionLine.lineName,
        stations: [],
        validationResultCount: 0,
        goal: 0,
        rate: 0
    };
    if (productionLine.hasOwnProperty('Shifts') && productionLine.Shifts.length > 0) {
        const shift = productionLine.Shifts[0];
        line.shiftId = shift.id;
        line.shiftDescription = shift.shiftDescription;
    }
    if (productionLine.hasOwnProperty('OperatingStations') && productionLine.OperatingStations.length > 0) {
        var stations = [];
        var totalValidationResultCount = 0;

        productionLine.OperatingStations.forEach(e => {
            const station = e.dataValues;
            totalValidationResultCount += station.validationResultCount;

            stations.push({
                id: station.id,
                identifier: station.stationIdentifier,
                validationResultCount: station.validationResultCount,
                blocked: station.StopCauseLogs.length > 0
            });
        });
        line.stations = stations;
        line.validationResultCount = totalValidationResultCount;
    }
    const shiftHours = getHoursPerShift(productionLine);
    line.goal = getProductionGoal(productionLine, shiftHours);
    line.rate = getProductionRate(line.validationResultCount, line.goal);

    return line;
}

async function getProductionLines(req, res) {
    try {
        const customer = validateModelId(req.params.customerId);
        if (!customer.isValid) {
            return badRequestError("Invalid parameter", res, customer.errorList);
        }
        const today = utcToZonedTime(new Date(), "America/Mexico_City");
        const productionlines = await services.ProductionLines.getProductionLineByCustomerIdAndShift(customer.id, today);
        res.json(productionlines);
    }
    catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getProductionCompliance(req, res) {
    try {
        const today = utcToZonedTime("2021-07-21 19:21:05.217Z", "America/Mexico_City");
        const line = validateModelId(req.params.lineId);
        if (!line.isValid) {
            return badRequestError("Invalid parameter", res, line.errorList);
        }
        const validationResults = await services.ValidationResults.getProductionComplianceImpl(line, today);
        
        res.json(validationResults);
    }
    catch (error) {
        logError("Error in getProductionCompliance", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionCompliance = getProductionCompliance;
