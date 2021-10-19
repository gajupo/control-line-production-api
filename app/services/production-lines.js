/* eslint-disable prefer-rest-params */
const { Sequelize, Op, QueryTypes } = require('sequelize');
const _ = require('lodash/');
const { utcToZonedTime } = require('date-fns-tz');
const datefns = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const models = require('../models');
const { sequelize, getDatePartConversion } = require('../helpers/sequelize');
const { logger } = require('../helpers/logger');
const shiftServices = require('./shift');

async function getProductionLinesPerCustomer(customerId) {
  try {
    const productionLines = await models.ProductionLine.findAll({
      attributes: ['id', 'lineName'],
      include: [{
        model: models.Customer,
        required: true,
        attributes: [],
        where: { id: customerId },
      }],
    });

    return productionLines;
  } catch (error) {
    throw new Error(error);
  }
}
/**
 * Returns all validation results, count validation result,
 * remaning minutes until shift end, productions rate by meterial scanned, the station id.
 * @param lineId
 * @param shiftEnd
 * @param customerId
 * @param shiftId
 */
async function getLineStatsByLineIdAndShift(line, customerId) {
  try {
    // eslint-disable-next-line prefer-rest-params
    logger.debug(`getLineStatsByLineIdAndShift arguments ${arguments}`);
    // return in case the shift for this particular line have not started, because there is any record in the table ProductionLineShiftHistories
    // al leats one operating station should scan one material to register the start of the shift in that table
    if (!line.ShiftStartedDatetime) return {};
    console.log(line.ShiftStartedDatetime);
    const dateTimeShiftStart = shiftServices.GetShiftStartAsDateTime(
      line.ShiftStartedDatetime,
      line.ShiftStartStr
    );
    const dateTimeShiftEnd = shiftServices.GetShiftEndAsDateTime(
      line.ShiftStartedDatetime, line.ShiftStartStr, line.ShiftEndStr
    );
    const productionLineStats = await sequelize.query(
      `SELECT 
            COUNT(ValidationResults.id) as validationResults,
            MIN(ValidationResults.ScanDate) as minDate,
            MAX(ValidationResults.ScanDate) as maxDate,            
            DATEDIFF(MINUTE, CONCAT(CONVERT (DATE, GETDATE()) ,' ', $shiftStart), MAX(ValidationResults.ScanDate)) as minutesUsed,
            DATEDIFF(MINUTE,MIN(ValidationResults.ScanDate), CONVERT (DATE, $dateTimeShiftEnd)) as shiftRemaningMinutes,
            ValidationResults.OrderIdentifier,
            Materials.ProductionRate,
            ValidationResults.MaterialId,
            ValidationResults.OrderId
            FROM ValidationResults
            inner join Materials on Materials.ID = ValidationResults.MaterialId
            inner join Orders on Orders.Id = ValidationResults.OrderId and Orders.ProductionLineId = $lineId and Orders.ShiftId = $shiftId
            WHERE 
                CONVERT(date, ValidationResults.ScanDate) >= $dateTimeShiftStart
                and CONVERT(date, ValidationResults.ScanDate) <= $dateTimeShiftEnd 
                and ValidationResults.CustomerId = $customerId 
            GROUP BY ValidationResults.OrderIdentifier,
            ValidationResults.OrderId,
            Materials.ProductionRate,
            ValidationResults.MaterialId`,
      {
        bind: {
          lineId: line.ProductionLineId,
          shiftId: line.ShiftId,
          dateTimeShiftStart: dateTimeShiftStart,
          dateTimeShiftEnd: dateTimeShiftEnd,
          shiftStart: line.ShiftStartStr,
          customerId: customerId,
        },
        raw: true,
        type: QueryTypes.SELECT,
      }
    );
    // pass line object to the next function
    productionLineStats.line = line;
    return productionLineStats;
  } catch (error) {
    throw new Error(error);
  }
}
// eslint-disable-next-line no-unused-vars
function GroupByLine(items, productionLineId) {
  // validate next day shifts
  const today = utcToZonedTime(new Date(), 'America/Mexico_City');
  // eslint-disable-next-line no-restricted-syntax
  for (const lineShift of items) {
    const shiftStartTotalSeconds = shiftServices.getShifTimeTotaltSeconds(lineShift.ShiftStartStr);
    let shiftEndTotalSeconds = shiftServices.getShifTimeTotaltSeconds(lineShift.ShiftEndStr);
    const currentTotalSeconds = shiftServices.getShifTimeTotaltSeconds(datefns.format(today, 'HH:mm:ss'));
    if (shiftStartTotalSeconds > shiftEndTotalSeconds
        && currentTotalSeconds >= shiftStartTotalSeconds) {
      const maxDaySeconds = shiftServices.getShifTimeTotaltSeconds('23:59:59');
      shiftEndTotalSeconds = maxDaySeconds + shiftEndTotalSeconds;
      if (currentTotalSeconds < shiftEndTotalSeconds) {
        logger.debug(`The selected shift will be end the next day ${lineShift.ShiftStartStr} - ${lineShift.ShiftEndStr}`);
        return lineShift;
      }
    }
    if (currentTotalSeconds >= shiftStartTotalSeconds
    && currentTotalSeconds < shiftEndTotalSeconds) {
      logger.debug(`Selected shift is ${lineShift.ShiftStartStr} - ${lineShift.ShiftEndStr}`);
      return lineShift;
    }
  }
}
/**
 *  Get all production lines, its current shift start and end value by customer
 * @param {*} customerId
 */
async function getProductionLinesAndShiftsByCustomer(customerId) {
  try {
    logger.debug(`getProductionLinesAndShiftsByCustomer arguments ${arguments}`);
    const productionLinesCurrentShift = await sequelize.query(
      `select 
                max(ProductionLineShifts.ShiftId) as ShiftId, 
                Shifts.ShiftStartStr, 
                Shifts.ShiftEndStr, 
                ProductionLineShifts.ProductionLineId as ProductionLineId,
                ProductionLines.Status as Active,
                ProductionLines.LineName,
                Customers.Id as CustomerId,
                Customers.CustomerName, 
                count(OperatingStations.Id) as NumberOfStations,
                (case when (count(OperatingStations.id) = count(StopCauseLogs.id)) then 1 else 0 end) as isBlocked,
                convert(varchar ,max(ProductionLineShiftHistories.ShiftStartDateTime), 20) as ShiftStartedDatetime
                --row_number() OVER(PARTITION BY ProductionLineShifts.ProductionLineId ORDER BY Shifts.ShiftStartStr desc) AS rn
            from ProductionLines
            left join ProductionLineShifts on ProductionLines.Id = ProductionLineShifts.ProductionLineId
            left join Shifts on Shifts.Id = ProductionLineShifts.ShiftId and Shifts.Active = 1 
            inner join Customers on ProductionLines.CustomerId = Customers.Id
            inner join OperatingStations on OperatingStations.LineId = ProductionLines.Id
            left join StopCauseLogs on StopCauseLogs.StationId = OperatingStations.Id  and StopCauseLogs.status = 1
            left join ProductionLineShiftHistories on ProductionLineShiftHistories.ProductionLineId = ProductionLines.id 
                      and ProductionLineShiftHistories.ShiftId = Shifts.Id
            where 
                ProductionLines.CustomerId = $customerId and ProductionLines.Status = 1
            group by 
                Shifts.ShiftStartStr, 
                Shifts.ShiftEndStr, 
                ProductionLineShifts.ProductionLineId,
                ProductionLines.Status,
                ProductionLines.LineName,
                Customers.Id,
                Customers.CustomerName,
                ProductionLineShifts.ShiftId`,
      {
        // eslint-disable-next-line object-shorthand
        bind: { customerId: customerId },
        raw: true,
        type: QueryTypes.SELECT,
      }
    );
    const valResult = models.validateLinesAndShifts(productionLinesCurrentShift);
    let currentLineShift = {};
    if (valResult.isValid) {
      currentLineShift = _(productionLinesCurrentShift).groupBy('ProductionLineId').map(GroupByLine).value();
      return currentLineShift;
    }
    logger.error(`getProductionLinesAndShiftsByCustomer - ${valResult.errorList}`);
    return currentLineShift;
  } catch (error) {
    throw new Error(error);
  }
}
/**
 * Calculates the percentage based on goal and sum of materials scanned
 */
function getCurrentProductionByRate(validationResultCount, goal) {
  if (goal === 0) {
    return 0;
  }
  const rate = Math.ceil((validationResultCount / goal) * 100);
  console.log(`[ El avance actual es ${rate} ]`);
  return (rate > 100) ? 100 : rate;
}
function getValidationResultCount(stations) {
  let count = 0;
  stations.forEach((station) => {
    count += station.dataValues.validationResultCount;
  });
  return count;
}
function checkIfLineHasOrders(line) {
  if ('Orders' in line) {
    const orders = line.Orders;
    return orders.length > 0;
  }
  return false;
}
function GroupByStationId(items, StationId) {
  let validationResultCountMeta = 0;
  let validationResultCount = 0;
  let goal = 0;
  // sum all scanned material but not the first one,
  // the first one is the last scanned, the sql query is ordered as DESC
  items.forEach((entry, index) => {
    if (index > 0) validationResultCountMeta += entry.countValidationResult;
  });
  // sum all scanned material
  validationResultCount = _.sumBy(items, 'countValidationResult');
  // we take the last scanned material and get the production rate
  // to obtain the remaining hours of the shift
  const shiftHours = items[0].remaningMinutes / 60;
  // calculate the goal (remainig hours * materials production rate) + total of scanned material
  // except the last one material
  // the goal will change until the materia changes
  goal = Math.floor(shiftHours * items[0].ProductionRate) + validationResultCountMeta;

  return {
    stationId: StationId,
    countValidationResult: _.sumBy(items, 'countValidationResult'),
    // eslint-disable-next-line object-shorthand
    goal: goal,
    rate: getCurrentProductionByRate(validationResultCount, goal),
  };
}
function transformProductionLine(lines, line, lineInfoStats) {
  const active = true;
  // group line orders by station id to obtaing a single object by station
  /* stationId: 1,
       countValidationResult: 300,
       goal:  1500,
       rate: 30
     */
  const currentProduction = _(lineInfoStats)
    .groupBy('StationId')
    .map(GroupByStationId).value();
    // list to store the current production for all stations of the line passed as parameter
  lines.push({
    id: line.ProductionLineId,
    lineName: line.LineName,
    // eslint-disable-next-line object-shorthand
    active: active,
    blocked: !!line.isBlocked,
    customerId: line.CustomerId,
    customerName: line.CustomerName,
    validationResultCount: _.sumBy(currentProduction, 'countValidationResult'), // sum fo all stations scanned materials
    goal: _.sumBy(currentProduction, 'goal'), // sum of goals for all stations
    rate: _.sumBy(currentProduction, 'rate'), // sum of all percentages completition vs goal
  });
}
/**
 * Return line object representation with 0 on rate, goal and total of scanned materials by line.
 * Used in case the line does not have shift or dayly production
 * @param lines Object to Store all lines of the customer
 * @param line The current line is being processed
 */
function transformProductionLineDefault(lines, line) {
  const validationResultCount = 0;
  const goal = 0;
  const active = true;
  lines.push({
    id: line.ProductionLineId,
    lineName: line.LineName,
    // eslint-disable-next-line object-shorthand
    active: active,
    blocked: !!line.isBlocked,
    customerId: line.CustomerId,
    customerName: line.CustomerName,
    // eslint-disable-next-line object-shorthand
    validationResultCount: validationResultCount,
    // eslint-disable-next-line object-shorthand
    goal: goal,
    rate: 0,
  });
}
function checkIfLineHasShifts(line) {
  if ('Shifts' in line) {
    const shifts = line.Shifts;
    return shifts.length > 0;
  }
  return false;
}

function checkIfLineIsBlocked(stations) {
  return stations.every((station) => station.StopCauseLogs.length > 0) > 0;
}
async function getProductionLines() {
  try {
    const productionlines = await models.ProductionLine.findAll({
      include: [{
        model: models.OperatingStation,
        attributes: ['id', 'stationIdentifier'],
      }],
      attributes: ['id', 'lineName'],
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
        where: { id: customerId },
      }, {
        model: models.Shift,
        attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd'],
        through: { attributes: [] },
        required: true,
        where: {
          active: true,
          shiftStart: {
            [Op.lte]: today.getHours(),
          },
          shiftEnd: {
            [Op.gte]: today.getHours(),
          },
        },
      }],
    });
    return productionlines;
  } catch (error) {
    throw new Error(error);
  }
}
async function getProductionLineById(productionLineId) {
  try {
    const productionLine = await models.ProductionLine.findOne({
      where: { id: productionLineId },
      include: [{
        model: models.OperatingStation,
        attributes: ['id', 'stationIdentifier'],
      }],
      attributes: ['id'],
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
            [Op.lte]: today.getHours(),
          },
          shiftEnd: {
            [Op.gte]: today.getHours(),
          },
        },
      }, {
        model: models.OperatingStation,
        attributes: [
          'id',
          'stationIdentifier',
          [Sequelize.fn('count', Sequelize.col('OperatingStations.ValidationResults.Id')), 'validationResultCount'],
        ],
        include: [{
          model: models.StopCauseLog,
          required: false,
          where: { status: true },
          attributes: ['id'],
        }, {
          model: models.ValidationResult,
          attributes: [],
          required: false,
          // eslint-disable-next-line no-undef
          where: Sequelize.where(getDatePartConversion('OperatingStations.ValidationResults.ScanDate'), '=', today),
        }],
      }, {
        model: models.Order,
        required: false,
        attributes: ['id'],
        where: {
          [Op.and]: [
            Sequelize.where(Sequelize.col('Orders.IsIncomplete'), '=', true),
            // eslint-disable-next-line no-undef
            Sequelize.where(getDatePartConversion('Orders.CreatedAt'), '<=', today),
          ],
        },
        include: [{
          model: models.Material,
          required: true,
          attributes: ['id', 'productionRate'],
        }],
      }],
      group: ['ProductionLine.id', 'ProductionLine.lineName',
        'OperatingStations.id', 'OperatingStations.stationIdentifier',
        'OperatingStations.StopCauseLogs.id', 'Orders.id', 'Orders.Material.id',
        'Orders.Material.productionRate', 'Shifts.id', 'Shifts.shiftStart',
        'Shifts.shiftEnd', 'Shifts.shiftDescription'],
    });
    return productionLine;
  } catch (error) {
    throw new Error(error);
  }
}
function formatProductionLineLiveStats(lines, currentLine, validationResults) {
  // eslint-disable-next-line max-len
  const dateTimeShiftStart = shiftServices.GetShiftStartAsDateTime(currentLine.ShiftStartedDatetime, currentLine.ShiftStartStr);
  const dateTimeShiftEnd = shiftServices.GetShiftEndAsDateTime(
    currentLine.ShiftStartedDatetime,
    currentLine.ShiftStartStr,
    currentLine.ShiftEndStr
  );
  // get difference in seconds from start to end shift
  const shiftDurationInMinutes = shiftServices.getShiftDifferenceInMinutes(
    dateTimeShiftEnd, dateTimeShiftStart
  );
  const active = true;
  if (validationResults.length === 0) {
    // there is no validations for this shift at this current moment
  } else if (validationResults.length === 1) {
    const goal = Math.floor((shiftDurationInMinutes * validationResults[0].ProductionRate) / 60);

    lines.push({
      id: currentLine.ProductionLineId,
      lineName: currentLine.LineName,
      active: active,
      blocked: !!currentLine.isBlocked,
      customerId: currentLine.CustomerId,
      customerName: currentLine.CustomerName,
      validationResultCount: validationResults[0].validationResults, // sum fo all stations scanned materials
      goal: goal, // sum of goals for all stations
      rate: getCurrentProductionByRate(validationResults[0].validationResults, goal), // sum of all percentages completition vs goal
    });
  } else if (validationResults.length === 2) {
    let finalGoal = 0;
    // check if all orders scanned have the same material
    const countSameProductionRate = validationResults.filter(
      (result) => result.ProductionRate === validationResults[0].ProductionRate
    ).length;
    if (countSameProductionRate === validationResults.length) {
      finalGoal = Math.floor((shiftDurationInMinutes * validationResults[0].ProductionRate) / 60);
    } else {
      // rate for the first material, from the beging of the shift to the last scan of the order
      const firstGoal = Math.floor(
        (validationResults[0].minutesUsed * parseInt(validationResults[0].ProductionRate, 10)) / 60
      );
      // obtain the real reamining minutes from the first order to the end of the shift is case the user start new order some minutes after the last one
      const minutesRemainingToTheEnd = shiftDurationInMinutes - validationResults[0].minutesUsed;
      // we use the remaining minutes in case the user do not start the new imediatly
      const lastGoal = Math.floor(
        (minutesRemainingToTheEnd * parseInt(validationResults[1].ProductionRate, 10)) / 60
      );
      finalGoal = (firstGoal + lastGoal);
    }
    // calculate the total of validation resualts
    const totalOfValidations = _.sumBy(validationResults, 'validationResults');
    lines.push({
      id: currentLine.ProductionLineId,
      lineName: currentLine.LineName,
      active: active,
      blocked: !!currentLine.isBlocked,
      customerId: currentLine.CustomerId,
      customerName: currentLine.CustomerName,
      validationResultCount: totalOfValidations, // sum fo all stations scanned materials
      goal: finalGoal, // sum of goals for all stations
      rate: getCurrentProductionByRate(totalOfValidations, finalGoal), // sum of all percentages completition vs goal
    });
  } else {
    let sumMiddleMaterialGoals = 0;
    let globalGoal = 0;
    let globalValidationResults = 0;
    // check if all orders scanned have the same material
    const countSameProductionRate = validationResults.filter(
      (result) => result.ProductionRate === validationResults[0].ProductionRate
    ).length;
    if (countSameProductionRate === validationResults.length) {
      globalGoal = Math.floor((shiftDurationInMinutes * validationResults[0].ProductionRate) / 60);
    } else {
      // rate for the first material, from the beging of the shift to the last scan of the order
      const firstGoal = Math.floor(
        (validationResults[0].minutesUsed * parseInt(validationResults[0].ProductionRate, 10)) / 60
      );

      // obtain the real reamining minutes from the first order to the end of the shift in case the user start new order some minutes after the last one
      // eslint-disable-next-line max-len
      const minutesRemainingToTheEnd = shiftDurationInMinutes - validationResults[validationResults.length - 2].minutesUsed;
      // we use the remaining minutes in case the user do not start the new imediatly
      const lastGoal = Math.floor(
        (minutesRemainingToTheEnd
            * parseInt(validationResults[validationResults.length - 1].ProductionRate, 10)
        ) / 60
      );

      for (let index = 1; index < validationResults.length - 1; index += 1) {
        const diffInMinutes = differenceInMinutes(new Date(validationResults[index].maxDate), new Date(validationResults[index - 1].maxDate), { roundingMethod: 'ceil' });
        console.log(diffInMinutes);
        // it means the difference is less than 1 then do not count for the goal
        if (diffInMinutes >= 1) {
          sumMiddleMaterialGoals += Math.floor(
            (
              diffInMinutes * parseInt(validationResults[index].ProductionRate, 10)
            ) / 60
          );
          globalGoal = firstGoal + sumMiddleMaterialGoals + lastGoal;
        }
      }
    }
    // get sum of all material scanned
    globalValidationResults = _.sumBy(validationResults, 'validationResults');
    lines.push({
      id: currentLine.ProductionLineId,
      lineName: currentLine.LineName,
      active: active,
      blocked: !!currentLine.isBlocked,
      customerId: currentLine.CustomerId,
      customerName: currentLine.CustomerName,
      validationResultCount: globalValidationResults, // sum fo all stations scanned materials
      goal: globalGoal, // sum of goals for all stations
      rate: getCurrentProductionByRate(globalValidationResults, globalGoal), // sum of all percentages completition vs goal
    });
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
module.exports.formatProductionLineLiveStats = formatProductionLineLiveStats;
