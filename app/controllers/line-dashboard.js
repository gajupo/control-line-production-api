'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError, badRequestError } = require("./core");
const { Sequelize } = require('sequelize');
const { utcToZonedTime } = require('date-fns-tz');
const { parseISO } = require('date-fns');

const { ProductionLine, OperatingStation, validateLinePerCustomerParameters,
    validateLineParameters, Customer, ValidationResult, Shift, StopCauseLog } = require('../models');

async function getProductionLine(req, res) {
    try {
        const line = validateLineParameters(req.params, req.body);
        if (!line.isValid) {
            return badRequestError("Invalid parameters passed", res, line.errorList);
        }
        const today = parseISO(line.productionDate);
        var productionLine = await ProductionLine.findOne({
            where: { id: line.lineId },
            attributes: ['id', 'lineName'],
            include: [{
                model: Shift,
                attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: true,
                where: {
                    active: true,
                    // shiftStart: {
                    //     [Op.lte]: today.getHours()
                    // },
                    // shiftEnd: {
                    //     [Op.gte]: today.getHours()
                    // }
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
            }],
            group: ['ProductionLine.id', 'ProductionLine.lineName', 
                'OperatingStations.id','OperatingStations.stationIdentifier',
                'OperatingStations.StopCauseLogs.id', //'Orders.Material.id',
                /*'Orders.Material.productionRate', 'Orders.id', 'Customer.id',
                'Customer.customerName',*/ 'Shifts.id', 'Shifts.shiftStart', 'Shifts.shiftEnd',
                'Shifts.shiftDescription']
        });
        const transformed = transformLine(productionLine);
        res.json(transformed);
        // res.json(productionLine);
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
    return line;
}

async function getProductionLines(req, res) {
    try {
        const customer = validateLinePerCustomerParameters(req.params, req.body);
        if (!customer.isValid) {
            return badRequestError("Invalid parameter", res, customer.errorList);
        }
        const today = parseISO(customer.productionDate);
        const productionlines = await ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: Customer,
                required: true,
                attributes: [],
                where: { id: customer.customerId }
            }, {
                model: Shift,
                attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: true,
                where: {
                    active: true,
                    // shiftStart: {
                    //     [Op.lte]: today.getHours()
                    // },
                    // shiftEnd: {
                    //     [Op.gte]: today.getHours()
                    // }
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
