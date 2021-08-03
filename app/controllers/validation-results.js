'use strict';

const { utcToZonedTime } = require('date-fns-tz');
const { Sequelize, Op } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError }= require("./core");
const { getDatePartConversion } = require('../helpers/sequelize');
const { ValidationResult, Order, Shift, Material } = require('../models');

async function getProductionPerHour(req, res) {
    try {
        const params = req.body;
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
            group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))]
        });
        res.json(validations);
    }
    catch (error) {
        logError("Error in getProductionPerHour", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getProductionRatePerHour(req, res) {
    try {
        const params = req.body;
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
            ]
        });
        res.json(productionRates);        
    }
    catch (error) {
        logError("Error in getProductionRatePerHour", error);
        return internalServerError(`Internal server error`, res); 
    }
}

module.exports.getProductionPerHour = getProductionPerHour;
module.exports.getProductionRatePerHour = getProductionRatePerHour;
