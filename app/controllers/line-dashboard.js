'use strict';

const { utcToZonedTime } = require('date-fns-tz');
const { logError } = require('../helpers/logger');
const { getDatePartConversion } = require('../helpers/sequelize');
const { internalServerError, badRequestError, getHoursPerShift, 
    getProductionGoal } = require("./core");
const { Sequelize, Op } = require('sequelize');
const { ProductionLine, OperatingStation, Customer, ValidationResult,
    Shift, StopCauseLog, validateModelId, Order, Material } = require('../models');

async function getProductionLine(req, res) {
    try {
        const line = validateModelId(req.params.lineId);
        if (!line.isValid) {
            return badRequestError("Invalid parameter passed to getProductionLine", res, line.errorList);
        }
        const today = utcToZonedTime("2021-07-21 19:21:05.217", "America/Mexico_City");
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
                    required: false,
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
                'Orders.Material.productionRate', /*'Customer.id',
                'Customer.customerName',*/ 'Shifts.id', 'Shifts.shiftStart', 'Shifts.shiftEnd',
                'Shifts.shiftDescription']
        });
        // const transformed = transformLine(productionLine);
        // res.json(transformed);
        res.json(productionLine);
    }
    catch (error) {
        logError("Error in getProductionLine", error);
        return internalServerError(`Internal server error`, res);  
    }
}

function transformLine(productionLine) {
    var line = {
        id: productionLine.id,
        lineName: productionLine.lineName
    };
    if (productionLine.hasOwnProperty('Shifts') && productionLine.Shifts.length > 0) {
        const shift = productionLine.Shifts[0];
        line.shiftId = shift.id;
        line.shiftDescription = shift.shiftDescription;
    }
    if (productionLine.hasOwnProperty('OperatingStations') && productionLine.OperatingStations.length > 0) {
        var stations = [];
        productionLine.OperatingStations.forEach(e => {
            const station = e.dataValues;
            stations.push({
                id: station.id,
                identifier: station.stationIdentifier,
                validationResultCount: station.validationResultCount,
                blocked: station.StopCauseLogs.length > 0
            });
        });
        line.stations = stations;
    }
    const shiftHours = getHoursPerShift(productionLine);
    const productionGoal = getProductionGoal(productionLine, shiftHours);
    line.productionGoal = productionGoal;

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

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
