'use strict';

const { utcToZonedTime } = require('date-fns-tz');
const { Sequelize, Op } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError }= require("./core");
const { getDatePartConversion } = require('../helpers/sequelize');
const { ValidationResult, Order, Shift, Material } = require('../models');

async function getValidationResultsPerHour(req, res) {
    try {
        const params = req.body;
        const [validationResults, productionRates] = await Promise.all([
            getValidationResultsPerHourImpl(params),
            getProductionRatePerHourImpl(params)
        ]);
        const joined = joinValidationsAndProductionRate(
            validationResults,
            productionRates,
            params.shiftStart,
            params.shiftEnd);
        res.json(joined);
    }
    catch(error) {
        logError("Error in getValidationResultsPerHour", error);
        return internalServerError(`Internal server error`, res);
    }

}

async function getValidationResultsPerHourImpl(params) {
    const today = utcToZonedTime(params.date, "America/Mexico_City");
    const validations = await ValidationResult.findAll({
        attributes:[
            [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate')), 'hour'],
            [Sequelize.fn('COUNT', Sequelize.col('ValidationResult.Id')), 'validationResultsCount']],
        include: [{
            model: Order,
            required: true,
            attributes: [],
            include: [{
                model: Shift,
                required: true,
                attributes: [],
                where: {
                    id: params.shiftId,
                    active: true
                }
            }],
            where: {
                [Op.and]: [
                    Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
                    Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today)        
                ]
            }
        }],
        where: {
            [Op.and]: [
                Sequelize.where(Sequelize.col('ValidationResult.CustomerId'), '=', params.customerId),
                Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today)
            ]
        },
        group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))],
        raw: true
    });
    return validations;
}

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

function joinValidationsAndProductionRate(validationResults, productionRates, shiftStart, shiftEnd) {
    const adjustedShiftStart = Math.floor(shiftStart);
    const adjustedShiftEnd = Math.floor(shiftEnd);
    var hours = [];
    var results = [];
    var rates = [];

    for (let i = adjustedShiftStart; i <= adjustedShiftEnd; i++) {
        hours.push(i);
        const validation = validationResults.find(result => result.hour == i);
        if (validation) {
            results.push(validation.validationResultsCount);
        }
        else {
            results.push(0);
        }
        const rate = productionRates.find(rate => rate.hour == i);
        if (rate) {
            rates.push(rate.productionRatesSum);
        }
        else {
            rates.push(0);
        }
    }
    const joined = {
        hours: hours,
        validationResults: results,
        productionRates: rates
    };
    return joined;
}

module.exports.getValidationResultsPerHour = getValidationResultsPerHour;
