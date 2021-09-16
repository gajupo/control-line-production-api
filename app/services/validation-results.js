const { Sequelize, Op, QueryTypes } = require('sequelize');
const { utcToZonedTime, format } = require('date-fns-tz');
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
async function getValidationResultsPerHourImpl(params) {
    try {
        const dateValue = utcToZonedTime(params.date,'America/Mexico_City');
        const pattern = 'yyyy-MM-dd HH:mm:ss';
        const validations = await sequelize.query(
            `select sum(result.validationResults) as [validationResults], sum(result.goalPerOrder) as [productionRates], result.scanHour as [hours] 
            from (
                select 
                count(ValidationResults.id) as validationResults,
                ( ( (DATEDIFF(SECOND,min(ValidationResults.ScanDate),max(ValidationResults.ScanDate)) / 60) * Materials.ProductionRate ) / 60) as goalPerOrder,
                DATEPART(HOUR, ValidationResults.ScanDate) as scanHour,
                --min(ValidationResults.ScanDate) as mindate,
                --max(ValidationResults.ScanDate) as maxdate,
                --DATEDIFF(SECOND,min(ValidationResults.ScanDate),max(ValidationResults.ScanDate)) as usedSeconds, 
                ValidationResults.OrderIdentifier
                --Materials.ProductionRate
                from ValidationResults
                inner join Materials on Materials.ID = ValidationResults.MaterialId
                inner join Orders on Orders.Id = ValidationResults.OrderId and Orders.ProductionLineId = $productionLineId and Orders.ShiftId = $shiftId
                where 
                CONVERT(date, ValidationResults.ScanDate) = $dateValue and ValidationResults.CustomerId = $customerId 
                GROUP BY DATEPART(HOUR, ValidationResults.ScanDate), ValidationResults.OrderIdentifier,Materials.ProductionRate
            ) as result
            group by result.scanHour`,
            {
            bind: { dateValue: format(dateValue, pattern), productionLineId: params.productionLineId, shiftId: params.shiftId, customerId: params.customerId},
            raw: true,
            type: QueryTypes.SELECT
            }
        );
    return validations;
    } catch (error) {
        throw new Error(error);
    }
    
}

module.exports.getProductionComplianceImpl = getProductionComplianceImpl;
module.exports.getValidationResultsPerHourImpl = getValidationResultsPerHourImpl;