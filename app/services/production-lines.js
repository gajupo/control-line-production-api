const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelize } = require("../helpers/sequelize");
const models = require("../models");


async function getProductionLinesPerCustomer(customerId) {
    try {

        const productionLines = await models.ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: models.Customer,
                required: true,
                attributes: [],
                where: { id: customerId }
            }]
        });

        return productionLines;
    }
    catch (error) {
        throw new Error(error);
    }
}
/**
 * Returns all validation results, count validation result, remaning minutes until shift end, productions rate by meterial scanned, the station id.
 * @param lineId 
 * @param shiftStart
 * @param shiftEnd 
 */
async function getLineStatsByLineIdAndShift(lineId, shiftStart, shiftEnd) {
    try {
        const productionLineStats = await sequelize.query(
            `select
                ROW_NUMBER() OVER(PARTITION BY ValidationResults.StationId ORDER BY ValidationResults.ScanDate DESC) AS RowNumber,
                ValidationResults.StationId,
                ValidationResults.MaterialId,
                ValidationResults.ScanDate,
                ValidationResults.OrderIdentifier,
                count(ValidationResults.id) OVER(PARTITION BY StationId,MaterialId) AS countValidationResult,
                DATEDIFF(MINUTE, min(ValidationResults.ScanDate) OVER(PARTITION BY StationId,MaterialId),CONCAT(CONVERT (DATE, SYSDATETIME()) ,' ', $shiftEnd)) as remaningMinutes,
                (select Materials.ProductionRate from Materials where Materials.id = ValidationResults.MaterialId) as productionRate,
                (select ProductionLines.LineName from ProductionLines inner join OperatingStations on ProductionLines.Id = OperatingStations.LineId where OperatingStations.Id = ValidationResults.StationId) as productionLine
            from ValidationResults 
            where 
                ValidationResults.ScanDate >= CONCAT(CONVERT (DATE, SYSDATETIME()) ,' ', $shiftStart) and ValidationResults.ScanDate <= CONCAT(CONVERT (DATE, SYSDATETIME()) ,' ', $shiftEnd)
                and ValidationResults.StationId in (
                    select ps.Id from OperatingStations AS ps inner join ProductionLines AS pl on ps.LineId = pl.Id inner join Customers AS co on pl.CustomerId = co.Id where pl.id = $lineId
                )
            order by ValidationResults.ScanDate desc`,
            {
              bind: { lineId: lineId, shiftStart: shiftStart, shiftEnd: shiftEnd },
              raw: true,
              type: QueryTypes.SELECT
            }
          );
          return productionLineStats;
    } catch (error) {
        throw new Error(error);
    }
}

module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getLineStatsByLineIdAndShift = getLineStatsByLineIdAndShift;