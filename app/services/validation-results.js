const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelize } = require("../helpers/sequelize");
const models = require("../models");

async function getProductionComplianceImpl(line, today) {
    try {
        const validationResults = await models.ValidationResult.findAll({
            attributes:[
                [Sequelize.fn('COUNT', Sequelize.col('ValidationResult.Id')), 'validationResultCount'],
                [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate')), 'scanHour']],
            include: [{
                model: models.Order,
                required: true,
                attributes: [],
                include: [{
                    model: models.Shift,
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
                }],
                where: { productionLineId: line.id }
            }],
            where: Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today),
            group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))]
        });
        return validationResults;
    } catch (error) {
        throw new Error(error);
    }
}

module.exports.getProductionComplianceImpl = getProductionComplianceImpl;