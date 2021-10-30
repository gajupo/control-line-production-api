const _ = require('lodash');
const datefns = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz/fp');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { zonedTimeToUtc } = require('date-fns-tz');
const { isValid, getMinutes } = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const { sequelize, getDatePartConversion } = require('../helpers/sequelize');
const models = require('../models');
const shiftServices = require('./shift');
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
function getRateForMiddleOrders(ordersByStation, hour, currentDate, parentFirstOrderUsed, parentLastOrderUsed) {
  let curretMaterialId = ordersByStation[0].materialId;
  const usedTimeAndRates = [];
  let orderListAux = [];
  let firstTime = true;
  let lastOrderUsed = {};
  for (let iFirstMaterial = 0; iFirstMaterial < ordersByStation.length; iFirstMaterial++) {
    const order = ordersByStation[iFirstMaterial];
    if (order.materialId === curretMaterialId) {
      orderListAux.push(order);
    } else {
      if (firstTime) {
        const last = _.last(orderListAux);
        const currentStartDate = (parentFirstOrderUsed) ? parentFirstOrderUsed.maxDate : `${currentDate} ${hour}:00:00`;
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
  const first = _.first(orderListAux);
  let timeUsed = shiftServices.getShiftDifferenceInMinutes(currentEndDate, first.minDate);
  // if the time used is equal to 0 at least we will use 1 minute
  timeUsed = (timeUsed === 0) ? 1 : timeUsed;
  usedTimeAndRates.push({ timeUsed: timeUsed, ProductionRate: orderListAux[0].ProductionRate });
  return usedTimeAndRates;
}
function calculateRateForFirstShiftOrder(order, shiftStartDate) {
  const timeUsed = shiftServices.differenceInMinutes(order.maxDate, shiftStartDate);
  return { timeUsed: timeUsed, ProductionRate: order.ProductionRate };
}
function calculateRateForLastShiftOrder(order, shiftEndDate) {
  const timeUsed = shiftServices.differenceInMinutes(shiftEndDate, order.minDate);
  return { timeUsed: timeUsed, ProductionRate: order.ProductionRate };
}
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
  // get the unique station id list in validationsResults
  const stationIdList = _.uniqBy(validationResults, 'stationId').map((item) => item.stationId);
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
      // get the count for validation by hour and date
      const countByHour = validationResults.filter(
        (result) => result.hour === hour && result.scanDate === shiftDate
      ).length;
      if (countByHour > 0) {
        // get all materials processed by the current hour and date
        const validationsPerHour = validationResults.filter(
          (result) => result.hour === hour && result.scanDate === shiftDate
        );
        // all orders has the same production rate
        const samePR = hasSameMaterial(validationsPerHour);
        if (samePR) {
          // all orders in the hour have the same material so then same PR
          const rateByHour = calculateRateSamePR(hourValue, validationsPerHour[0].ProductionRate, stationIdList.length);
          rates.push(rateByHour);
        } else {
        // TODO: get unique stations again in this hour, because it could some stations that do not have validations
          const ratesByStation = [];
          let firsShiftProccesed = false;
          let firstOrderUsed;
          let lastOrderUsed;
          for (let iStation = 0; iStation < stationIdList.length; iStation++) {
            const stationId = stationIdList[iStation];
            let stationOrders = filterOrdersByStation(stationId, validationsPerHour);
            if (hasSameMaterial(stationOrders)) {
              if (hour === theVeryFirstShiftHour) firsShiftProccesed = true;
              const rate = calculateRateSamePR(hourValue, stationOrders[0].ProductionRate, 1);
              ratesByStation.push(rate);
            } else {
              //------------------------------------------------------------------------------------------------------------
              // check if we are processing the first hour of the shift, we will use the first minute of the shift start time
              if (hour === theVeryFirstShiftHour && !firsShiftProccesed) {
                const first = _.first(stationOrders);
                ratesByStation.push(calculateRateForFirstShiftOrder(first, shiftStartDate));
                stationOrders = _.remove(stationOrders, (o) => o === first);
                firstOrderUsed = first;
              }
              if (hour === theVeryLastShiftHour) {
                const last = _.last(stationOrders);
                ratesByStation.push(calculateRateForLastShiftOrder(last, shiftEndDate));
                stationOrders = _.remove(stationOrders, (o) => o === last);
                lastOrderUsed = last;
              }
              // the orders of the station in this hour do not have the same material
              const ordersRates = getRateForMiddleOrders(stationOrders, hour, shiftDate, firstOrderUsed, lastOrderUsed);
              const rate = calculateRateDifferentPR(ordersRates, hourValue);
              ratesByStation.push(rate);
            }
          }
          rates.push(_.sum(ratesByStation));
        }
        // count validation result by hour
        results.push(_.sumBy(validationsPerHour, (o) => o.validationResults));
      } else {
        let rate = 0;
        // TODO: CHECK LAST AND FIRST VALID ORDER
        // in this hour there is no material validations
        results.push(0);
        // keep the rate of the last order for this particual hour
        if (!!firstNotEmptyOrder && Object.prototype.hasOwnProperty.call(firstNotEmptyOrder, 'ProductionRate')) {
          // if we are in the first hour of the shift we will use the next not empty order to get the rate
          if (hour === theVeryFirstShiftHour) {
            rate = calculateRateSamePR(hourValue, firstNotEmptyOrder.ProductionRate, stationIdList.length);
          } else if (hour === theVeryLastShiftHour) {
            rate = calculateRateSamePR(hourValue, lastNotEmptyOrder.ProductionRate, stationIdList.length);
          } else {
            // for the rest of the orders we will use the rate of the last order created
            // check if the next hour has production if it has we use that production rate
            const validationsNextHour = validationResults.filter(
              (result) => result.hour > hour && result.validationResults > 0
              && result.scanDate === shiftDate
            );
            if (!_.isEmpty(validationsNextHour)) {
              rate = calculateRateSamePR(hourValue, validationsNextHour[0].ProductionRate, stationIdList.length);
            } else {
              rate = calculateRateSamePR(hourValue, lastNotEmptyOrder.ProductionRate, stationIdList.length);
            }
          }

          rates.push(rate);
        } else rates.push(0);
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

module.exports.getProductionComplianceImpl = getProductionComplianceImpl;
module.exports.getValidationResultsPerHourImpl = getValidationResultsPerHourImpl;
module.exports.joinValidationsAndProductionRate = joinValidationsAndProductionRate;
