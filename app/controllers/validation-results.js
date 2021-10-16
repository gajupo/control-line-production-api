'use strict';

const { utcToZonedTime,format,zonedTimeToUtc } = require('date-fns-tz');
const { isValid, parseISO, parse, getMinutes  } = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const { Sequelize, Op } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError }= require("./core");
const services = require('../services');
const { getDatePartConversion } = require('../helpers/sequelize');
const { ValidationResult, Order, Shift, Material } = require('../models');

async function getValidationResultsPerHour(req, res) {
    try {
        const params = req.body;
        const productionPerHour = await services.ValidationResults.getValidationResultsPerHourImpl(params);
        const joined = services.ValidationResults.joinValidationsAndProductionRate(productionPerHour,params.shiftStart, params.shiftEnd);
        res.json(joined);
    }
    catch(error) {
        logError("Error in getValidationResultsPerHour", error);
        return internalServerError(`Internal server error`, res);
    }

}

// async function getValidationResultsPerHourImpl(params) {
//     const today = utcToZonedTime(params.date, "America/Mexico_City");
    
//     const validations = await ValidationResult.findAll({
//         attributes:[
//             [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate')), 'hour'],
//             [Sequelize.fn('COUNT', Sequelize.col('ValidationResult.Id')), 'validationResultsCount']],
//         include: [{
//             model: Order,
//             required: true,
//             attributes: [],
//             include: [{
//                 model: Shift,
//                 required: true,
//                 attributes: [],
//                 where: {
//                     id: params.shiftId,
//                     active: true
//                 }
//             }],
//             where: {
//                 [Op.and]: [
//                     Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
//                     Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today)        
//                 ]
//             }
//         }],
//         where: {
//             [Op.and]: [
//                 Sequelize.where(Sequelize.col('ValidationResult.CustomerId'), '=', params.customerId),
//                 Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today)
//             ]
//         },
//         group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))],
//         raw: true
//     });
//     return validations;
// }

async function getProductionRatePerHourImpl(params) {
    const today = utcToZonedTime(params.date, "America/Mexico_City");
    const productionRates = await Order.findAll({
        attributes: [
            [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')), 'hour'],
            [Sequelize.fn('SUM', Sequelize.col('Material.ProductionRate')), 'productionRatesSum']
        ],
        include: [{
            model: Material,
            required: true,
            attributes: []
        }],
        where: {
            [Op.and]: [
                Sequelize.where(Sequelize.col('Order.ShiftId'), '=', params.shiftId),
                Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
                Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today)        
            ]
        },
        group: [
            Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')),
            'Material.ID',
            'Material.ProductionRate'
        ],
        raw: true
    });
    return productionRates;
}

module.exports.getValidationResultsPerHour = getValidationResultsPerHour;
