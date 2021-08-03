'use strict';

const { Sequelize } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError }= require("./core");
const { ValidationResult, Customer, Order, Shift, ProductionLine } = require('../models');

async function getProductionPerHour(req, res) {
    try {
        const params = req.body;
        const validations = ValidationResult.findAll({
            include: [{
                model: Customer,
                attributes:[
                    [Sequelize.fn('COUNT', Sequelize.col('ValidationResult.Id')), 'validationResultCount'],
                    [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate')), 'scanHour']],
                required: true,
                where: { id: params.customerId }
            }, {
                model: Order,
                include: [{
                    model: Shift,
                    attributes: [],
                    required: true,
                    where: { id: params.shiftId }
                }, {
                    model: ProductionLine,
                    attributes: [],
                    required: true,
                    where: { id: params.productionLineId }
                }]
            }],
            where: Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today),
            group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))]
        });
        res.json(validations);
    }
    catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError(`Internal server error`, res);
    }
}
