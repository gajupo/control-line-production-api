'use strict';

const { utcToZonedTime } = require('date-fns-tz');
const { logError } = require('../helpers/logger');
const { getDatePartConversion } = require('../helpers/sequelize');
const { internalServerError, badRequestError, getHoursPerShift, 
    getProductionGoal, getProductionRate } = require("./core");
const { Sequelize, Op } = require('sequelize');
const { ProductionLine, OperatingStation, Customer, ValidationResult,
    Shift, StopCauseLog, validateModelId, Order, Material } = require('../models');

    
async function getProductionLine(req, res) {
    try {
        const today = utcToZonedTime("2021-07-21 19:21:05.217", "America/Mexico_City");
        const productionLine = await getProductionLineImpl(req, res, today);
        const compliance = await getProductionComplianceImpl(req, res, today);
        productionLine.compliance = compliance;

        res.json(productionLine);
    }
    catch (error) {
        logError("Error in getProductionLine", error);
        return internalServerError(`Internal server error`, res);  
    }
}

async function getProductionLineImpl(req, res, today) {
    try {
        const line = validateModelId(req.params.lineId);
        if (!line.isValid) {
            return badRequestError("Invalid parameter passed to getProductionLineImpl", res, line.errorList);
        }
        const productionLine = await ProductionLine.findOne({
            where: { id: line.id },
            attributes: ['id', 'lineName'],
            include: [{
                model: Shift,
                attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: true,
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
                    required: true,
                    where: Sequelize.where(getDatePartConversion('OperatingStations.ValidationResults.ScanDate'), '=', today)
                }]
            }, {
                model: Order,
                required: false,
                attributes: ['id'],
                where: {
                    [Op.and]: [
                        Sequelize.where(Sequelize.col('Orders.IsIncomplete'), '=', true),
                        Sequelize.where(getDatePartConversion('Orders.CreatedAt'), '<=', today)
                    ]
                },
                include: [{
                    model: Material,
                    required: true,
                    attributes: ['id', 'productionRate']
                }]
            }],
            group: ['ProductionLine.id', 'ProductionLine.lineName', 
                'OperatingStations.id','OperatingStations.stationIdentifier',
                'OperatingStations.StopCauseLogs.id', 'Orders.id', 'Orders.Material.id',
                'Orders.Material.productionRate', 'Shifts.id', 'Shifts.shiftStart',
                'Shifts.shiftEnd', 'Shifts.shiftDescription']
        });
        const transformed = transformLine(productionLine);
        return transformed;
    }
    catch (error) {
        logError("Error in getProductionLineImpl", error);
        return internalServerError(`Internal server error`, res);  
    }
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
        const productionlines = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                required: true,
                attributes: [],
                where: { id: customer.id }
            }, {
                model: Shift,
                attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: true,
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
        const validationResults = await getProductionComplianceImpl(req, res, today);
        
        res.json(validationResults);
    }
    catch (error) {
        logError("Error in getProductionCompliance", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getProductionComplianceImpl(req, res, today) {
    const line = validateModelId(req.params.lineId);
    if (!line.isValid) {
        return badRequestError("Invalid parameter passed", res, line.errorList);
    }
    const validationResults = await ValidationResult.findAll({
        attributes:[
            [Sequelize.fn('COUNT', Sequelize.col('ValidationResult.Id')), 'validationResultCount'],
            [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate')), 'scanHour']],
        include: [{
            model: Order,
            required: true,
            attributes: [],
            include: [{
                model: Shift,
                required: true,
                attributes: [],
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
        }, {
            model: Customer,
            attributes: [],
            where: { id: line.id }
        }],
        where: Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today),
        group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))]
    });
    return validationResults;
}

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionCompliance = getProductionCompliance;
