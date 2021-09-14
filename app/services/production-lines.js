const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelize } = require("../helpers/sequelize");
const models = require("../models");
const _ = require('lodash/');

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
            `select 
            MAX(Shifts.Id) as ShiftId, 
            Shifts.ShiftStartStr, 
            Shifts.ShiftEndStr, 
            ProductionLineShifts.ProductionLineId as ProductionLineId,
            ProductionLines.Status as Active,
            ProductionLines.LineName,
            Customers.Id as CustomerId,
            Customers.CustomerName, 
            count(ProductionLines.Id) as NumberOfLines,
            (case when (count(OperatingStations.id) = count(StopCauseLogs.id)) then 1 else 0 end) as isBlocked
        from ProductionLines
        left join ProductionLineShifts on ProductionLines.Id = ProductionLineShifts.ProductionLineId
        left join 
            Shifts on Shifts.Id = ProductionLineShifts.ShiftId and 
            CAST(CONCAT(FORMAT(getdate(),'yyyy-MM-dd'),' ',  Shifts.ShiftStartStr) AS DATETIME) <= GETDATE() and
            CAST(CONCAT(FORMAT(getdate(),'yyyy-MM-dd'),' ', Shifts.ShiftEndStr) AS DATETIME) >= GETDATE()
        inner join Customers on ProductionLines.CustomerId = Customers.Id
        inner join OperatingStations on OperatingStations.LineId = ProductionLines.Id
        left join StopCauseLogs on StopCauseLogs.StationId = OperatingStations.Id  and StopCauseLogs.status = 1
        where 
            ProductionLines.CustomerId = $customerId and ProductionLines.Status = 1
        group by 
            Shifts.ShiftStartStr, 
            Shifts.ShiftEndStr, 
            ProductionLineShifts.ProductionLineId,
            ProductionLines.Status,
            ProductionLines.LineName,
            Customers.Id,
            Customers.CustomerName;`,
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
function GroupByStationId(items, StationId){
    let validationResultCountMeta = 0;
    let validationResultCount = 0;
    let goal = 0;
    // sum all scanned material exceptio the first one, the first one is the last scanned, the sql query is ordered as DESC
    items.forEach(function(entry,index) {
        if(index > 0)
            validationResultCountMeta += entry.countValidationResult;
    });
    // sum all scanned material
    validationResultCount = _.sumBy(items, 'countValidationResult');
    // we take the last scanned material and get the production rate to obtain the remaining hours of the shift
    shiftHours = items[0].remaningMinutes / 60;
    // calculate the goal (remainig hours * materials production rate) + total of scanned material except the last one material
    // the goal will change until the materia changes
    goal = Math.floor(shiftHours * items[0].ProductionRate) + validationResultCountMeta;

    return {
        stationId: StationId, 
        countValidationResult: _.sumBy(items, 'countValidationResult'),
        goal:  goal,
        rate: getCurrentProductionByRate(validationResultCount, goal)
    };
}
function transformProductionLine(lines, line, lineInfoStats){

    let active = true;
    // group line orders by station id to obtaing a single object by station
    /* stationId: 1, 
       countValidationResult: 300,
       goal:  1500,
       rate: 30
     */
    let currentProduction = _(lineInfoStats)
                .groupBy('StationId')
                .map(GroupByStationId).value();
    // list to store the current production for all stations of the line passed as parameter
    lines.push( {
        id: line.ProductionLineId,
        lineName: line.LineName,
        active: active,
        blocked: !!line.isBlocked,
        customerId: line.CustomerId,
        customerName: line.CustomerName,
        validationResultCount: _.sumBy(currentProduction, 'countValidationResult'), // sum fo all stations scanned materials
        goal: _.sumBy(currentProduction, 'goal'), // sum of goals for all stations
        rate: _.sumBy(currentProduction, 'rate') // sum of all percentages completition vs goal
    });
    
}
/**
 * Return line object representation with 0 on rate, goal and total of scanned materials by line.
 * Used in case the line does not have shift or dayly production
 * @param lines Object to Store all lines of the customer
 * @param line The current line is being processed
 */
function transformProductionLineDefault(lines,line) {

    let validationResultCount = 0;
    let validationResultCountMeta = 0;
    let goal = 0;
    let active = true;
    lines.push( {
        id: line.ProductionLineId,
        lineName: line.LineName,
        active: active,
        blocked: !!line.isBlocked,
        customerId: line.CustomerId,
        customerName: line.CustomerName,
        validationResultCount: validationResultCount,
        goal: goal,
        rate: 0
    });
    
}
/**
 * Calculates the percentage based on goal and sum of materials scanned
 */
function getCurrentProductionByRate(validationResultCount, goal){
    if (goal == 0) {
        return 0;
    }
    let rate = Math.ceil((validationResultCount / goal) * 100);
    console.log(`[ El avance actual es ${rate} ]`)
    return (rate > 100)? 100 : rate;
}
function getValidationResultCount(stations) {
    let count = 0;
    stations.forEach(station => {
        count += station.dataValues.validationResultCount;
    });
    return count;
}

function checkIfLineHasOrders(line) {
    if ("Orders" in line) {
        const orders = line.Orders;
        return orders.length > 0;
    }
    return false;
}

function checkIfLineHasShifts(line) {
    if ("Shifts" in line) {
        const shifts = line.Shifts;
        return shifts.length > 0;
    }
    return false;
}

function checkIfLineIsBlocked(stations) {
    return stations.every(station => station.StopCauseLogs.length > 0) > 0;
}
async function getProductionLines() {
    try {
        const productionlines = await models.ProductionLine.findAll({
            include: [{
                model: models.OperatingStation,
                attributes: ['id', 'stationIdentifier']
            }],
            attributes: ['id', 'lineName']
        });
        return productionlines;
    } catch (error) {
        throw new Error(error);
    }
}
async function getProductionLineByCustomerIdAndShift(customerId, today) {
    try {
        
        const productionlines = await models.ProductionLine.findAll({
            attributes: ['id', 'lineName'],
            include: [{
                model: models.Customer,
                required: true,
                attributes: [],
                where: { id: customerId }
            }, {
                model: models.Shift,
                attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: true,
                where: {
                    active: true,
                    shiftStart: {
                        [Op.lte]: today.getHours()
                    },
                    shiftEnd: {
                        [Op.gte]: today.getHours()
                    }
                }
            }]
        });
        return productionlines;
    } catch (error) {
        throw new Error(error);
    }
}
async function getProductionLineById(productionLineId) {
    try {
        var productionLine = await models.ProductionLine.findOne({
            where: { id: productionLineId },
            include: [{
                model: models.OperatingStation,
                attributes: ['id', 'stationIdentifier']
            }],
            attributes: ['id']
        });
        return productionLine;
    } catch (error) {
        throw new Error(error);
    }
}
async function getProductionLineImpl(line, today) {
    try {
        const productionLine = await models.ProductionLine.findOne({
            where: { id: line.id },
            attributes: ['id', 'lineName'],
            include: [{
                model: models.Shift,
                attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
                through: { attributes: [] },
                required: true,
                where: {
                    active: true,
                    shiftStart: {
                        [Op.lte]: today.getHours()
                    },
                    shiftEnd: {
                        [Op.gte]: today.getHours()
                    }
                }
            }, {
                model: models.OperatingStation,
                attributes: [
                    'id',
                    'stationIdentifier',
                    [Sequelize.fn('count', Sequelize.col('OperatingStations.ValidationResults.Id')), 'validationResultCount']
                ],
                include: [{
                    model: models.StopCauseLog,
                    required: false,
                    where: { status: true },
                    attributes: ['id']
                }, {
                    model: models.ValidationResult,
                    attributes: [],
                    required: false,
                    where: Sequelize.where(getDatePartConversion('OperatingStations.ValidationResults.ScanDate'), '=', today)
                }]
            }, {
                model: models.Order,
                required: false,
                attributes: ['id'],
                where: {
                    [Op.and]: [
                        Sequelize.where(Sequelize.col('Orders.IsIncomplete'), '=', true),
                        Sequelize.where(getDatePartConversion('Orders.CreatedAt'), '<=', today)
                    ]
                },
                include: [{
                    model: models.Material,
                    required: true,
                    attributes: ['id', 'productionRate']
                }]
            }],
            group: ['ProductionLine.id', 'ProductionLine.lineName', 
                'OperatingStations.id','OperatingStations.stationIdentifier',
                'OperatingStations.StopCauseLogs.id', 'Orders.id', 'Orders.Material.id',
                'Orders.Material.productionRate', 'Shifts.id', 'Shifts.shiftStart',
                'Shifts.shiftEnd', 'Shifts.shiftDescription']
        });
        return productionLine;
    } catch (error) {
        throw new Error(error);
    }
}
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getLineStatsByLineIdAndShift = getLineStatsByLineIdAndShift;
module.exports.getProductionLinesAndShiftsByCustomer = getProductionLinesAndShiftsByCustomer;
module.exports.transformProductionLine = transformProductionLine;
module.exports.transformProductionLineDefault = transformProductionLineDefault;
module.exports.getValidationResultCount = getValidationResultCount;
module.exports.checkIfLineHasOrders = checkIfLineHasOrders;
module.exports.checkIfLineHasShifts = checkIfLineHasShifts;
module.exports.checkIfLineIsBlocked = checkIfLineIsBlocked;
module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLineById = getProductionLineById;
module.exports.getProductionLineImpl = getProductionLineImpl;
module.exports.getProductionLineByCustomerIdAndShift = getProductionLineByCustomerIdAndShift;