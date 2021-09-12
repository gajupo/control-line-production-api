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
                ValidationResults.StationId,
                ValidationResults.MaterialId,
                ValidationResults.OrderIdentifier,
                ValidationResults.OrderId,
                count(ValidationResults.id)  as countValidationResult,
                DATEDIFF(MINUTE,min(ValidationResults.ScanDate), CONCAT(CONVERT (DATE, SYSDATETIME()) ,' ', $shiftEnd)) as remaningMinutes,
                Materials.ProductionRate
            from ValidationResults 
            inner join OperatingStations on OperatingStations.Id = ValidationResults.StationId
            inner join ProductionLines on ProductionLines.Id = OperatingStations.LineId
            inner join Customers on Customers.Id = ProductionLines.Id
            inner join Materials on Materials.ID = ValidationResults.MaterialId
            where ValidationResults.ScanDate >= CONCAT(CONVERT (DATE, SYSDATETIME()) ,' ', $shiftStart) and ValidationResults.ScanDate <= CONCAT(CONVERT (DATE, SYSDATETIME()) ,' ', $shiftEnd)
            and ValidationResults.StationId in (
                    select ps.Id from OperatingStations AS ps inner join ProductionLines AS pl on ps.LineId = pl.Id inner join Customers AS co on pl.CustomerId = co.Id where pl.Id = $lineId
                )
            group by ValidationResults.StationId, ValidationResults.MaterialId, ValidationResults.OrderIdentifier,Materials.ProductionRate, ValidationResults.OrderId
            order by ValidationResults.OrderId desc`,
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
/**
 *  Get all production lines, its current shift start and end value by customer
 * @param {*} customerId 
 */
async function getProductionLinesAndShiftsByCustomer(customerId) {
    try {
        const productionLinesCurrentShift = await sequelize.query(
            `Select 
                MAX(Shifts.Id) as ShiftId, 
                Shifts.ShiftStartStr, 
                Shifts.ShiftEndStr, 
                ProductionLines.Id as ProductionLineId,
                ProductionLines.Status as Active,
                ProductionLines.LineName,
                Customers.Id as CustomerId,
                Customers.CustomerName, 
                count(ProductionLines.Id) as NumberOfLines  
            from ProductionLines
            inner join ProductionLineShifts on ProductionLines.Id = ProductionLineShifts.ProductionLineId
            inner join Shifts on Shifts.Id = ProductionLineShifts.ShiftId
            inner join Customers on ProductionLines.CustomerId = Customers.Id
            where 
                ProductionLines.CustomerId = $customerId and 
                CAST(Shifts.ShiftStart AS FLOAT) <= CAST(FORMAT(GETDATE(),'HH.mm') AS FLOAT) and 
                CONVERT(FLOAT, Shifts.ShiftEnd) >= CAST(FORMAT(GETDATE(),'HH.mm') AS FLOAT)
            group by Shifts.ShiftStartStr, Shifts.ShiftEndStr, ProductionLines.Id,ProductionLines.LineName,Customers.Id,Customers.Id,ProductionLines.Status, Customers.CustomerName`,
            {
              bind: { customerId: customerId},
              raw: true,
              type: QueryTypes.SELECT
            }
          );
          return productionLinesCurrentShift;
    } catch (error) {
        throw new Error(error);
    }
}

function transformProductionLine(lines,line, lineInfoStats) {

    const customer = line.CustomerName;
    let validationResultCount = 0;
    let validationResultCountMeta = 0;
    let goal = 0;
    let active = true;

    if(lineInfoStats[0].remaningMinutes <= 1)
    {    
        lineInfoStats.forEach(function(entry) {
            validationResultCount += entry.countValidationResult;
        });
        goal = 1 + validationResultCount;
    }
    else
    {
        shiftHours = lineInfoStats[0].remaningMinutes / 60;   
        //validationResultCount = getValidationResultCount(stations);
    
        lineInfoStats.forEach(function(entry,index) {
            if(index > 0)
                validationResultCountMeta += entry.countValidationResult;
            validationResultCount += entry.countValidationResult;
        });
        goal = Math.floor(shiftHours * lineInfoStats[0].ProductionRate) + validationResultCountMeta;
    }
   

    lines.push( {
        id: line.ProductionLineId,
        lineName: line.LineName,
        active: active,
        blocked: false,
        customerId: line.CustomerId,
        customerName: line.CustomerName,
        validationResultCount: validationResultCount,
        goal: goal,
        rate: getCurrentProductionByRate(validationResultCount,goal)
    });
    
}
function getCurrentProductionByRate(validationResultCount, goal) {
    if (goal == 0) {
        return 0;
    }
    return Math.floor((validationResultCount / goal) * 100);
}
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getLineStatsByLineIdAndShift = getLineStatsByLineIdAndShift;
module.exports.getProductionLinesAndShiftsByCustomer = getProductionLinesAndShiftsByCustomer;
module.exports.transformProductionLine = transformProductionLine;