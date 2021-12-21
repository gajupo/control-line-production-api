/* eslint-disable no-param-reassign */
const _ = require('lodash');
const datefns = require('date-fns');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { zonedTimeToUtc, utcToZonedTime } = require('date-fns-tz');
const { sequelize, getDatePartConversion } = require('../helpers/sequelize');
const models = require('../models');
const shiftServices = require('./shift');
const productionLinesServices = require('./production-lines');
const { logger } = require('../helpers/logger');

async function getProductionComplianceImpl(line, today) {
  try {
    const validationResults = await models.ValidationResult.findAll({
      attributes: [
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
              [Op.lte]: today.getHours(),
            },
            shiftEnd: {
              [Op.gte]: today.getHours(),
            },
          },
        }],
        where: { productionLineId: line.id },
      }],
      // eslint-disable-next-line no-undef
      where: Sequelize.where(getDatePartConversion('ValidationResult.ScanDate'), '=', today),
      group: [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('ValidationResult.ScanDate'))],
    });
    return validationResults;
  } catch (error) {
    throw new Error(error);
  }
}
async function getValidationResultsPerHourImpl(params) {
  try {
    const reportDate = zonedTimeToUtc(params.date, 'America/Mexico_City');
    const shiftStartDateTime = shiftServices.GetShiftStartAsDateTime(
      reportDate.toISOString(),
      params.shiftStart
    );
    const dateTimeShiftEnd = shiftServices.GetShiftEndAsDateTime(
      reportDate.toISOString(),
      params.shiftStart, params.shiftEnd
    );
    const validations = await sequelize.query(
      `SELECT 
        count(ValidationResults.id) as validationResults,
        DATEPART(HOUR, ValidationResults.ScanDate) as hour,
        convert(varchar, min(ValidationResults.ScanDate), 23) as scanDate,
        convert(varchar, min(ValidationResults.ScanDate), 120) as minDate,
        convert(varchar, max(ValidationResults.ScanDate), 120) as maxDate,
        DATEDIFF(MINUTE, Orders.CreatedAt, MAX(ValidationResults.ScanDate)) as minutesUsed,
        ValidationResults.OrderIdentifier as [orderIdentifier],
        Materials.ProductionRate,
        ValidationResults.StationId as [stationId],
        Materials.ID as [materialId]
      FROM ValidationResults
        inner join Materials on Materials.ID = ValidationResults.MaterialId
        inner join Orders on Orders.Id = ValidationResults.OrderId 
                             and Orders.ProductionLineId = $productionLineId 
                             and Orders.ShiftId = $shiftId
      WHERE 
        CONVERT(datetime, ValidationResults.ScanDate) >= CONVERT(datetime, $startdate) 
        and CONVERT(datetime, ValidationResults.ScanDate) <= CONVERT(datetime, $enddate) 
        and ValidationResults.CustomerId = $customerId
      GROUP BY 
        DATEPART(HOUR, ValidationResults.ScanDate),
        ValidationResults.OrderIdentifier,
        Materials.ProductionRate, ValidationResults.StationId,
        Materials.ID, Orders.CreatedAt
      ORDER BY min(ValidationResults.ScanDate), ValidationResults.StationId`,
      {
        bind: {
          startdate: shiftStartDateTime,
          enddate: dateTimeShiftEnd,
          productionLineId: params.productionLineId,
          shiftId: params.shiftId,
          customerId: params.customerId,
        },
        raw: true,
        type: QueryTypes.SELECT,
      }
    );
    return validations;
  } catch (error) {
    throw new Error(error);
  }
}
async function getValidationResultsPerLine(lineInfo) {
  try {
    const validations = await sequelize.query(
      `SELECT 
        count(ValidationResults.id) as validationResults,
        DATEPART(HOUR, ValidationResults.ScanDate) as hour,
        convert(varchar, min(ValidationResults.ScanDate), 23) as scanDate,
        convert(varchar, min(ValidationResults.ScanDate), 120) as minDate,
        convert(varchar, max(ValidationResults.ScanDate), 120) as maxDate,
        DATEDIFF(MINUTE, Orders.CreatedAt, MAX(ValidationResults.ScanDate)) as minutesUsed,
        ValidationResults.OrderIdentifier as [orderIdentifier],
        Materials.ProductionRate,
        ValidationResults.StationId as [stationId],
        Orders.StationIdentifier as [stationIdentifier],
        Materials.ID as [materialId],
        ISNULL(StopCauseLogs.status,0) as status
      FROM ValidationResults
        inner join Materials on Materials.ID = ValidationResults.MaterialId
        inner join Orders on Orders.Id = ValidationResults.OrderId 
                             and Orders.ProductionLineId = $productionLineId 
                             and Orders.ShiftId = $shiftId
        LEFT OUTER JOIN StopCauseLogs on StopCauseLogs.StationId = ValidationResults.StationId
      WHERE 
        CONVERT(datetime, ValidationResults.ScanDate) >= CONVERT(datetime, $startDate) 
        and CONVERT(datetime, ValidationResults.ScanDate) <= CONVERT(datetime, $endDate) 
        and ValidationResults.CustomerId = $customerId
        and (StopCauseLogs.id IS NULL OR StopCauseLogs.id = (select max(id) from StopCauseLogs where StopCauseLogs.StationId = ValidationResults.StationId group by StopCauseLogs.StationId))
      GROUP BY 
        DATEPART(HOUR, ValidationResults.ScanDate),
        ValidationResults.OrderIdentifier,
        Materials.ProductionRate, ValidationResults.StationId,
        Materials.ID, Orders.CreatedAt,
        Orders.StationIdentifier,
        StopCauseLogs.status
      ORDER BY min(ValidationResults.ScanDate), ValidationResults.StationId`,
      {
        bind: {
          startDate: lineInfo.ShiftStartedDateTime,
          endDate: lineInfo.ShiftEndDateTime,
          productionLineId: lineInfo.ProductionLineId,
          shiftId: lineInfo.ShiftId,
          customerId: lineInfo.CustomerId,
        },
        raw: true,
        type: QueryTypes.SELECT,
      }
    );
    validations.lineInfo = lineInfo;
    return validations;
  } catch (error) {
    console.log("ERROR API ", error);
    throw new Error(error);
  }
}
function filterOrdersByStation(stationId, ordersByHour) {
  return (ordersByHour) ? ordersByHour.filter((order) => order.stationId === stationId) : [];
}
/**
 * Check if a given set of orders have the same production rate
 * @param {*} ordersByHour
 * @returns {*} true|false
 */
function hasSameMaterial(ordersByHour) {
  const countSameProductionRate = ordersByHour.filter(
    (result) => result.ProductionRate === ordersByHour[0].ProductionRate
  ).length;
  return countSameProductionRate === ordersByHour.length;
}
function calculateRateDifferentPR(ordersRates) {
  let rate = 0;
  for (let index = 0; index < ordersRates.length; index++) {
    const order = ordersRates[index];
    rate += (order.ProductionRate * order.timeUsed) / 60;
  }
  return Math.ceil(rate);
}
function calculateRateSamePR(hourValue, productionRate, stationCount) {
  return Math.ceil(
    ((productionRate * hourValue) / 60)
  ) * stationCount;
}
/**
 * returns the rate for all those orders except the first and the last one
 * @param {*} ordersByStation
 * @returns Array
 */
function getRateForMiddleOrders(
  ordersByStation,
  hour,
  currentDate,
  parentFirstOrderUsed,
  parentLastOrderUsed,
  stationcount
) {
  let curretMaterialId = ordersByStation[0].materialId;
  const usedTimeAndRates = [];
  let orderListAux = [];
  let firstTime = true;
  let lastOrderUsed = {};
  let currentStartDate = '';
  // add 0 as prefix if the hour is less than 10
  if (hour < 10) hour = `0${hour}`;
  for (let iFirstMaterial = 0; iFirstMaterial < ordersByStation.length; iFirstMaterial++) {
    const order = ordersByStation[iFirstMaterial];
    if (order.materialId === curretMaterialId) {
      orderListAux.push(order);
    } else {
      if (firstTime) {
        const last = _.last(orderListAux);
        currentStartDate = (parentFirstOrderUsed) ? parentFirstOrderUsed.maxDate : `${currentDate} ${hour}:00:00`;
        let timeUsed = shiftServices.getShiftDifferenceInMinutes(last.maxDate, currentStartDate);
        timeUsed = (timeUsed === 0) ? 1 : timeUsed;
        usedTimeAndRates.push({ timeUsed: timeUsed, ProductionRate: orderListAux[0].ProductionRate });
        firstTime = true;
        lastOrderUsed = last;
      } else {
        const last = _.last(orderListAux);
        let timeUsed = shiftServices.getShiftDifferenceInMinutes(last.maxDate, lastOrderUsed.maxDate);
        // if the time used is equal to 0 at least we will use 1 minute
        timeUsed = (timeUsed === 0) ? 1 : timeUsed;
        usedTimeAndRates.push({ timeUsed: timeUsed, ProductionRate: orderListAux[0].ProductionRate });
        lastOrderUsed = last;
      }
      curretMaterialId = order.materialId;
      orderListAux = [];
      orderListAux.push(order);
    }
  }
  const currentEndDate = (parentLastOrderUsed) ? parentLastOrderUsed.minDate : `${currentDate} ${hour}:59:59`;
  if (firstTime && _.isEmpty(lastOrderUsed)) {
    currentStartDate = `${currentDate} ${hour}:00:00`;
  } else {
    currentStartDate = _.last(orderListAux).minDate;
  }
  let timeUsed = shiftServices.getShiftDifferenceInMinutes(currentEndDate, currentStartDate);
  // if the time used is equal to 0 at least we will use 1 minute
  timeUsed = (timeUsed === 0) ? 1 : timeUsed;
  usedTimeAndRates.push({ timeUsed: timeUsed, ProductionRate: orderListAux[0].ProductionRate });
  return usedTimeAndRates;
}
function getRatesForFirstShiftOrder(order, shiftStartDate) {
  const timeUsed = shiftServices.getShiftDifferenceInMinutes(order.maxDate, shiftStartDate);
  return { timeUsed: timeUsed, ProductionRate: order.ProductionRate };
}
function getRateForLastShiftOrder(order, shiftEndDate) {
  const timeUsed = shiftServices.getShiftDifferenceInMinutes(shiftEndDate, order.minDate);
  return { timeUsed: timeUsed, ProductionRate: order.ProductionRate };
}
function getLastStationsByHour(validationResults, hour) {
  const lastOrder = _.findLast(
    validationResults,
    (r) => r.hour <= hour && r.validationResults > 0
  );
  if (_.isEmpty(lastOrder)) return [];
  const validationsPerHour = validationResults.filter((items) => items.hour === lastOrder.hour);
  if (validationsPerHour.length === 1) {
    // get the unique station id list in validationsResults
    return [validationsPerHour[0].stationId];
  }
  // get the unique station id list in validationsResults
  return _.uniqBy(validationsPerHour, 'stationId').map((item) => item.stationId);
}
function getFirstStationsByHour(validationResults, hour) {
  const firstOrder = _.find(validationResults, (r) => r.hour >= hour && r.validationResults > 0);
  const validationsPerHour = validationResults.filter(
    (items) => items.hour === firstOrder.hour
  );
  // get the unique station id list in validationsResults
  return _.uniqBy(validationsPerHour, 'stationId').map((item) => item.stationId);
}
function lastNotEmptyOrderByHour(validationResults, hour) {
  return _.findLast(validationResults, (o) => o.validationResults > 0 && o.hour < hour);
}
function ValidationsByStation(items, stationIdentifier) {
  return {
    stationIdentifier: stationIdentifier,
    countValidationResult: _.sumBy(items, 'validationResults'),
    id: items[0].stationId,
    blocked: items[0].status,
  };
}
function getLastOrderAndItsPR(items, stationIdentifier) {
  return {
    lastOrder: _.last(items),
  };
}
function calculateStationsRate(hourValue, stationIdList, validationResults) {
  const stationGoals = [];
  for (let iStation = 0; iStation < stationIdList.length; iStation++) {
    const stationId = stationIdList[iStation];
    // get all validation by station to calculate its rate individualy
    const firstNotEmptyOrder = _.find(validationResults, (o) => o.validationResults > 0 && o.stationId === stationId);
    if (_.isEmpty(firstNotEmptyOrder)) {
      stationGoals.push(0);
    } else {
      stationGoals.push((hourValue * firstNotEmptyOrder.ProductionRate) / 60);
    }
  }
  return _.sum(stationGoals);
}
function calculateStationsRateLastHour(hourValue, stationIdList, validationResults) {
  const stationGoals = [];
  for (let iStation = 0; iStation < stationIdList.length; iStation++) {
    const stationId = stationIdList[iStation];
    const lastNotEmptyOrder = _.findLast(
      validationResults,
      (o) => o.validationResults > 0 && o.stationId === stationId
    );
    if (_.isEmpty(lastNotEmptyOrder)) {
      stationGoals.push(0);
    } else {
      stationGoals.push((hourValue * lastNotEmptyOrder.ProductionRate) / 60);
    }
  }
  return _.sum(stationGoals);
}
function calculateStationsRateMiddleHours(hourValue, stationIdList, validationResults, hour) {
  const stationGoals = [];
  let order = {};
  for (let iStation = 0; iStation < stationIdList.length; iStation++) {
    const stationId = stationIdList[iStation];
    order = _.findLast(
      validationResults,
      (o) => o.validationResults > 0 && o.stationId === stationId && o.hour < hour
    );
    if (_.isEmpty(order)) {
      order = _.find(
        validationResults,
        (o) => o.validationResults > 0 && o.stationId === stationId
      );
    }
    // there is any validation in the next hours
    if (_.isEmpty(order)) {
      stationGoals.push(0);
    } else {
      // let firstHourFound = 0;
      // let lastHourFound = 0;
      // if (!_.isEmpty(firstNotEmptyOrder)) {
      //   firstHourFound = shiftServices.getShiftHour(firstNotEmptyOrder.minDate.split(' ')[1]);
      // }
      // if (!_.isEmpty(lastNotEmptyOrder)) {
      //   lastHourFound = shiftServices.getShiftHour(lastNotEmptyOrder.minDate.split(' ')[1]);
      // }
      // if (hour < firstHourFound) {
      //   order = firstNotEmptyOrder;
      // } else if (hour >= lastHourFound) {
      //   order = lastNotEmptyOrder;
      // }
      stationGoals.push((hourValue * order.ProductionRate) / 60);
    }
  }
  return _.sum(stationGoals);
}
function calculateAchievableGoal(validationResults, lineInfo) {
  const today = utcToZonedTime(new Date(), 'America/Mexico_City');
  const shiftEndDate = lineInfo.ShiftEndDateTime;
  const achievableGoals = [];
  // remaining time to the end of the shoft
  const totalShiftMinutes = shiftServices.getShiftDifferenceInMinutes(shiftEndDate, datefns.format(today, 'yyyy-MM-dd HH:mm:ss'));
  // validation result sum
  const currentValidationResults = _.sumBy(validationResults, (o) => o.validationResults);
  // last order by station and its production rate
  const lastOrderPerStation = _(validationResults)
    .groupBy('stationIdentifier')
    .map((items) => _.last(items)).value();
  // calculate achievable goal per station
  for (let iOrderStation = 0; iOrderStation < lastOrderPerStation.length; iOrderStation++) {
    const lastOrder = lastOrderPerStation[iOrderStation];
    achievableGoals.push((lastOrder.ProductionRate * totalShiftMinutes) / 60);
  }
  // sume achievable goal + sum of validation results
  // return achievable goal
  return Math.floor(_.sum(achievableGoals) + currentValidationResults);
}
/**
 * Returs information for hour by hour report for a given customer, line and shift
 * @param {*} validationResults
 * @param {*} shiftStart
 * @param {*} shiftEnd
 * @param {*} reportDate
 * @returns An object with hourly reporting information
 */
function joinValidationsAndProductionRate(validationResults, shiftStart, shiftEnd, reportDate) {
  const hours = [];
  const results = [];
  const rates = [];
  let hourValue = 60;
  const shiftDates = [];
  // get first hour the shift
  let shiftLoopFirstHour = shiftServices.getShiftHour(shiftStart);
  const theVeryFirstShiftHour = shiftServices.getShiftHour(shiftStart);
  const theVeryLastShiftHour = shiftServices.getShiftHour(shiftEnd);
  const shiftStartMinutes = shiftServices.getShiftMinutes(shiftStart);
  const shiftEndMinutes = shiftServices.getShiftMinutes(shiftEnd);
  const dayLastHour = 23;
  let shiftLoopLastHour = 0;

  const paramDate = zonedTimeToUtc(reportDate, 'America/Mexico_City');
  const shiftStartDate = shiftServices.GetShiftStartAsDateTime(paramDate.toISOString(), shiftStart);
  const shiftEndDate = shiftServices.GetShiftEndAsDateTime(paramDate.toISOString(), shiftStart, shiftEnd);
  const totalShiftHours = shiftServices.getShiftDifferenceInHours(shiftEndDate, shiftStartDate);
  // if start and end date is not the same day, we will look for hours in the next day starting by 0 = 12 AM
  if (!datefns.isSameDay(datefns.parseISO(shiftEndDate), datefns.parseISO(shiftStartDate))) {
    // current day - 2021-10-27 15:30:00
    shiftDates.push(datefns.format(datefns.parseISO(shiftStartDate), 'yyyy-MM-dd'));
    // next day - 2021-10-28 00:30:00
    shiftDates.push(datefns.format(datefns.parseISO(shiftEndDate), 'yyyy-MM-dd'));
  } else {
    // start and end shift is the same day, 2021-10-27 06:00:00 - 2021-10-27 15:29:59
    // in the next loop we will filter just by one date
    shiftDates.push(datefns.format(datefns.parseISO(shiftStartDate), 'yyyy-MM-dd'));
  }
  // we need the last order to get the production rate in case some hours does not have production,
  const lastNotEmptyOrder = _.findLast(validationResults, (o) => o.validationResults > 0);
  // get first order not empty
  const firstNotEmptyOrder = _.find(validationResults, (o) => o.validationResults > 0);
  // get the unique station id list in validationsResults
  const stationIdList = _.uniqBy(validationResults, 'stationId').map((item) => item.stationId);
  // loop shift dates to filter scanned materials
  for (let index = 0; index < shiftDates.length; index++) {
    //-
    const shiftDate = shiftDates[index];
    // the shift will start in current day and ends in the next one, that is why we iterate until 23 hour for the current date
    if (index === 0 && shiftDates.length > 1) {
      shiftLoopLastHour = dayLastHour;
    } else if (index === 0 && shiftDates.length === 1) {
      // start and end shift is in the same day
      // shiftLoopLastHour must be equal to the end of the shift
      shiftLoopLastHour = shiftLoopFirstHour + totalShiftHours;
    } else if (index > 0 && shiftDates.length >= 1) {
      // iterate for reamining hours for next day shift
      shiftLoopLastHour = shiftServices.getShiftHour(shiftEnd);
      // restart the hour counter to start in 0 for the next day
      shiftLoopFirstHour = 0;
    }
    // loop shift hours
    for (let hour = shiftLoopFirstHour; hour <= shiftLoopLastHour; hour++) {
      // set hour value that will be used to do the calculations
      // at the beginin or at the end of the shift the hour value could be a halft of an hour
      if (hour === theVeryFirstShiftHour) {
        hourValue = (shiftStartMinutes === 0) ? 60 : shiftStartMinutes;
      } else if (hour === theVeryLastShiftHour) {
        hourValue = (shiftEndMinutes === 0) ? 60 : shiftEndMinutes;
      } else {
        // for the middle hours in the shift
        hourValue = 60;
      }
      // store the current hour to show in the chart
      hours.push(hour);
      // get validations count by hour and date
      const countByHour = validationResults.filter(
        (result) => result.hour === hour && result.scanDate === shiftDate
      ).length;
      if (countByHour > 0) {
        // get all materials processed by the current hour and date
        const validationsPerHour = validationResults.filter(
          (result) => result.hour === hour && result.scanDate === shiftDate
        );
        // get the unique station id list in validationsResults
        // const stationIdList = _.uniqBy(validationsPerHour, 'stationId').map((item) => item.stationId);
        // all orders has the same production rate
        // const samePR = hasSameMaterial(validationsPerHour);
        // if (samePR) {
        //   // all orders in the hour have the same material so then same PR
        //   const rateByHour = calculateRateSamePR(hourValue, validationsPerHour[0].ProductionRate, stationIdList.length);
        //   rates.push(rateByHour);
        // } else {
        // TODO: get unique stations again in this hour, because it could some stations that do not have validations
        const ratesByStation = [];
        let ratesAndTimesByStation = [];
        let firsShiftProccesed = false;
        let firstOrderUsed;
        let lastOrderUsed;
        for (let iStation = 0; iStation < stationIdList.length; iStation++) {
          const stationId = stationIdList[iStation];
          const stationOrders = filterOrdersByStation(stationId, validationsPerHour);
          if (_.isEmpty(stationOrders)) {
            stationOrders.push(
              _.findLast(
                validationResults,
                (o) => o.validationResults > 0 && o.stationId === stationId && o.hour < hour
              )
            );
          }
          if (hasSameMaterial(stationOrders)) {
            const rate = calculateRateSamePR(hourValue, stationOrders[0].ProductionRate, 1);
            ratesByStation.push(rate);
          } else {
            const first = _.first(stationOrders);
            const last = _.last(stationOrders);
            //------------------------------------------------------------------------------------------------------------
            // check if we are processing the first hour of the shift, we will use the first minute of the shift start time
            if (hour === theVeryFirstShiftHour) {
              ratesAndTimesByStation.push(getRatesForFirstShiftOrder(first, shiftStartDate));
              _.remove(stationOrders, (o) => o.orderIdentifier === first.orderIdentifier);
              firstOrderUsed = first;
            }
            if (hour === theVeryLastShiftHour) {
              ratesAndTimesByStation.push(getRateForLastShiftOrder(last, shiftEndDate));
              _.remove(stationOrders, (o) => o.orderIdentifier === last.orderIdentifier);
              lastOrderUsed = last;
            }
            // the orders of the station in this hour do not have the same material
            ratesAndTimesByStation.push(
              getRateForMiddleOrders(
                stationOrders,
                hour,
                shiftDate,
                firstOrderUsed,
                lastOrderUsed,
                stationIdList.length
              )
            );
            logger.info('%o', _.flatten(ratesAndTimesByStation));
            const rate = calculateRateDifferentPR(_.flatten(ratesAndTimesByStation), hourValue);
            ratesByStation.push(rate);
            // clean array
            ratesAndTimesByStation = [];
          }
        }
        // sum stations rates
        rates.push(_.sum(ratesByStation));
        // }
        // count validation result by hour
        results.push(_.sumBy(validationsPerHour, (o) => o.validationResults));
      } else {
        let rate = 0;
        // in this hour there is no material validations
        results.push(0);
        // if we are in the first hour of the shift we will use the next not empty order to get the rate
        if (hour === theVeryFirstShiftHour) {
          // const stations = getFirstStationsByHour(validationResults, firstNotEmptyOrder.hour);
          // rate = calculateRateSamePR(hourValue, firstNotEmptyOrder.ProductionRate, stationIdList.length);
          rate = calculateStationsRate(hourValue, stationIdList, validationResults);
        } else if (hour === theVeryLastShiftHour) {
          // const stations = getLastStationsByHour(validationResults, lastNotEmptyOrder.hour);
          // rate = calculateRateSamePR(hourValue, lastNotEmptyOrder.ProductionRate, stationIdList.length);
          rate = calculateStationsRateLastHour(hourValue, stationIdList, validationResults);
        } else {
          // for the rest of the hours if we dont have validation keep the last rate calculated
          // rate = calculateRateSamePR(hourValue, lastNotEmptyOrder.ProductionRate, stationIdList.length);
          rate = calculateStationsRateMiddleHours(hourValue, stationIdList, validationResults, hour);
        }
        rates.push(rate);
      }
    }
  }
  // final object used in the report "hora por hora"
  const joined = {
    hours: hours,
    validationResults: results,
    productionRates: rates,
  };
  return joined;
}
/**
 * This function returns information about line status and production that is shown in the general dashboard
 * @param {*} validationResults
 * @param {*} lineInfo
 * @returns An object with all information about the line and its production in real tiem
 */
function computeLineProductionLive(validationResults, lineInfo) {
  const stationGoals = [];
  const hourValue = 60;
  // shift end as date time
  const shiftEndDate = lineInfo.ShiftEndDateTime;
  // sum of total of validation for all stations
  const currentValidationResults = _.sumBy(validationResults, (o) => o.validationResults);
  // group by station
  const stationsProductionArray = _(validationResults)
    .groupBy('stationIdentifier')
    .map((items) => items).value();
  // loop stations
  for (let iStation = 0; iStation < stationsProductionArray.length; iStation++) {
    const stationOrders = stationsProductionArray[iStation];
    let prevMaterial = 0;
    let splitedOrders = [];
    // loop orders and check if material changes
    for (let iOrder = 0; iOrder < stationOrders.length; iOrder++) {
      const order = stationOrders[iOrder];
      if (prevMaterial !== order.materialId && prevMaterial !== 0) {
        // calculate goal for every material and time used in minutes from the first order to the last one
        const startDateTime = _.first(splitedOrders).minDate;
        const endDateTime = _.last(splitedOrders).maxDate;
        const diffInMinutes = shiftServices.getShiftDifferenceInMinutes(endDateTime, startDateTime);
        //  store goal of the station
        const materialStationGoal = Math.floor((stationOrders[0].ProductionRate * diffInMinutes) / hourValue);
        stationGoals.push(materialStationGoal);
        // clean stored orders on every material change
        splitedOrders = [];
        // if the next order will be the last one we store it to made the propper calculations
        if (iOrder === stationOrders.length - 1) {
          splitedOrders.push(stationOrders[stationOrders.length - 1]);
        } else {
          splitedOrders.push(order);
        }
        // store the prev material used
        prevMaterial = order.materialId;
      } else {
        splitedOrders.push(order);
        prevMaterial = order.materialId;
      }
      // check if we are at the end of the loop
      if (iOrder === stationOrders.length - 1) {
        // calculate goal for every material and time used in minutes from the first order to the last one
        const startDateTime = _.first(splitedOrders).minDate;
        const endDateTime = _.last(splitedOrders).maxDate;
        const diffInMinutes = shiftServices.getShiftDifferenceInMinutes(endDateTime, startDateTime);
        //  store goal of the station
        const splitedOrdersGoal = Math.floor((stationOrders[0].ProductionRate * diffInMinutes) / hourValue);
        // get ramaining time till the end of the shift because we are in the last order proccesed by the station
        const diffTimeTillEndShift = shiftServices.getShiftDifferenceInMinutes(shiftEndDate, endDateTime);
        const remainingGoal = Math.floor((_.last(splitedOrders).ProductionRate * diffTimeTillEndShift) / hourValue);
        stationGoals.push(splitedOrdersGoal);
        stationGoals.push(remainingGoal);
      }
    }
  }
  // sum all goal of all stations
  const goal = _.sum(stationGoals);
  const lineLiveProgress = {
    id: lineInfo.ProductionLineId,
    lineName: lineInfo.LineName,
    active: true,
    blocked: !!lineInfo.isBlocked,
    customerId: lineInfo.CustomerId,
    customerName: lineInfo.CustomerName,
    validationResultCount: currentValidationResults, // sum fo all stations scanned materials
    goal: goal, // sum of goals for all stations
    rate: productionLinesServices.getCurrentProductionByRate(currentValidationResults, goal), // sum of all percentages completition vs goal
  };
  return lineLiveProgress;
}
/**
 * Returns all needed information used in the line dashboard for a given production line
 * @param {*} validationResults
 * @param {*} lineInfo
 * @returns An object with all information to be shown in the line dashboard
 */
function computeLineDashboardProductionLive(validationResults, lineInfo) {
  // gets stations and its validation count
  /**
   * Example of list of stations and its production count
    {
      stationIdentifier: STATION1,
      countValidationResult: 100,
      id: 1,
      blocked: false,
    }
   */
  const stationsProductionArray = _(validationResults)
    .groupBy('stationIdentifier')
    .map(ValidationsByStation).value();

  // returns the bellow object with all information about line and its production
  const lineLiveProduction = computeLineProductionLive(validationResults, lineInfo);
  // calculates de the achievableGoal for the given line based on its current production
  // we set the value for achievableGoal on the object lineLiveProduction
  lineLiveProduction.achievableGoal = calculateAchievableGoal(validationResults, lineInfo);
  /**
   * Object for lineLiveProduction that is returned latter
   {
      achievableGoal:1988
      active:true
      blocked:false
      customerId:'1'
      customerName:undefined
      goal:2535
      id:'1'
      lineName:undefined
      rate:7
      validationResultCount:168
   }
   */
  const lineLiveProgress = {
    lineLiveProduction: lineLiveProduction,
    stationsProduction: stationsProductionArray,
  };
  return lineLiveProgress;
}

module.exports.getProductionComplianceImpl = getProductionComplianceImpl;
module.exports.getValidationResultsPerHourImpl = getValidationResultsPerHourImpl;
module.exports.joinValidationsAndProductionRate = joinValidationsAndProductionRate;
module.exports.getValidationResultsPerLine = getValidationResultsPerLine;
module.exports.computeLineProductionLive = computeLineProductionLive;
module.exports.computeLineDashboardProductionLive = computeLineDashboardProductionLive;
