'use strict';

const { utcToZonedTime } = require('date-fns-tz');
const { Sequelize, Op } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError }= require("./core");
const { getDatePartConversion } = require('../helpers/sequelize');
const { ValidationResult, Order, Shift } = require('../models');

async function getProductionPerHour(req, res) {
    try {
        const params = req.body;
        const today = utcToZonedTime(params.date, "America/Mexico_City");
        const validations = await ValidationResult.findAll({
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
                        id: params.shiftId,
                        active: true,
                        shiftStart: {
                            [Op.lte]: today.getHours()
                        },
                        shiftEnd: {
                            [Op.gte]: today.getHours()
                        }
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
        logError("Error in getProductionLines", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getProductionPerHour = getProductionPerHour;
