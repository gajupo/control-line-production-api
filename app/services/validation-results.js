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
  return (ordersByHour) ? ordersByHour.filter((order) => order.starionId === stationId) : [];
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
  return rate;
}
function calculateRateSamePR(hourValue, productionRate, stationCount) {
  return Math.ceil(
    ((productionRate * hourValue) / 60)
  ) * stationCount;
}
/**
 * return all first orders with the same production rate
 * @param {*} ordersByStation
 * @returns Array
 */
function getTimeUsedByMaterial(ordersByStation, shiftStartDate, shiftEndDate) {
  let curretMaterialId = ordersByStation[0].materialId;
  const usedTimeAndRates = [];
  let firstTime = true;
  for (let iFirstMaterial = 0; iFirstMaterial < ordersByStation.length; iFirstMaterial++) {
    let orderListAux = [];
    const order = ordersByStation[iFirstMaterial];
    if (order.materialId === curretMaterialId) {
      orderListAux.push(order);
    } else {
      if (firstTime) {
        let timeUsed = shiftServices.getShiftDifferenceInMinutes(shiftStartDate, _.last(orderListAux).maxDate);
        // if the time used is equal to 0 at least we will use 1 minute
        timeUsed = (timeUsed === 0) ? 1 : timeUsed;
        usedTimeAndRates.push({
          timeUsed: timeUsed,
          ProductionRate: orderListAux[0].ProductionRate,
        });
        firstTime = false;
      } else {
        let timeUsed = _.sumBy(orderListAux, (o) => o.minutesUsed);
        // if the time used is equal to 0 at least we will use 1 minute
        timeUsed = (timeUsed === 0) ? 1 : timeUsed;
        usedTimeAndRates.push({ timeUsed: timeUsed, ProductionRate: orderListAux[0].ProductionRate });
      }
      curretMaterialId = order.materialId;
      orderListAux = [];
      orderListAux.push(order);
    }
    let timeUsed = shiftServices.getShiftDifferenceInMinutes(shiftEndDate, _.first(orderListAux).minDate);
    // if the time used is equal to 0 at least we will use 1 minute
    timeUsed = (timeUsed === 0) ? 1 : timeUsed;
    usedTimeAndRates.push({ timeUsed: timeUsed, ProductionRate: orderListAux[0].ProductionRate });
  }
  return usedTimeAndRates;
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
    const date = shiftDates[index];
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
      const countByHour = validationResults.filter((result) => result.hour === hour && result.scanDate === date).length;
      if (countByHour > 0) {
        // get all materials processed by the current hour and date
        const validationsPerHour = validationResults.filter(
          (result) => result.hour === hour && result.scanDate === date
        );
        // all orders has the same production rate
        const samePR = hasSameMaterial(validationsPerHour);
        if (samePR) {
          // all orders in the hour have the same material so then same PR
          const rateByHour = calculateRateSamePR(hourValue, validationsPerHour[0].ProductionRate, stationIdList.length);
          rates.push(rateByHour);
        } else {
          const ratesByStation = [];
          for (let iStation = 0; iStation < stationIdList.length; iStation++) {
            const stationId = stationIdList[iStation];
            const stationOrders = filterOrdersByStation(stationId, validationsPerHour);
            if (hasSameMaterial(stationOrders)) {
              const rate = calculateRateSamePR(hourValue, stationOrders[0].ProductionRate, 1);
              ratesByStation.push(rate);
            } else {
              // the orders of the station in this hour do not have the same material
              const ordersRates = getTimeUsedByMaterial(stationOrders, shiftStartDate, shiftEndDate);
              const rate = calculateRateDifferentPR(ordersRates, hourValue);
              ratesByStation.push(rate);
            }
          }
          rates.push(_.sum(ratesByStation));
        }

        // -
        // count validation result by hour
        results.push(_.sumBy(validationsPerHour, (o) => o.validationResults));
      } else {
        let rate = 0;
        // in this hour there is no material validations
        results.push(0);
        // keep the rate of the last order for this particual hour
        if (!!firstNotEmptyOrder && Object.prototype.hasOwnProperty.call(firstNotEmptyOrder, 'ProductionRate')) {
          // if we are in the first hour of the shift we will use the next not empty order to get the rate
          if (hour === theVeryFirstShiftHour) {
            // rate = Math.ceil((hourValue * firstNotEmptyOrder.ProductionRate) / 60) * CountOperatingStations;
            rate = calculateRateSamePR(hourValue, firstNotEmptyOrder.ProductionRate, stationIdList.length);
          } else if (hour === theVeryLastShiftHour) {
            // rate = Math.ceil((hourValue * lastNotEmptyOrder.ProductionRate) / 60) * CountOperatingStations;
            rate = calculateRateSamePR(hourValue, lastNotEmptyOrder.ProductionRate, stationIdList.length);
          } else {
            // for the rest of the orders we will use the rate of the last order created
            // check if the next hour has production if it has we use that production rate
            const validationsNextHour = validationResults.filter(
              (result) => result.hour === (hour + 1)
              && result.scanDate === date
            );
            if (!_.isEmpty(validationsNextHour)) {
              // rate = Math.ceil((hourValue * validationsNextHour[0].ProductionRate) / 60) * CountOperatingStations;
              rate = calculateRateSamePR(hourValue, validationsNextHour[0].ProductionRate, stationIdList.length);
            } else {
              // rate = Math.ceil((hourValue * lastNotEmptyOrder.ProductionRate) / 60) * CountOperatingStations;
              rate = calculateRateSamePR(hourValue, lastNotEmptyOrder.ProductionRate, stationIdList.length);
            }
          }

          rates.push(rate);
        } else rates.push(0);
      }
      //-
      // if countByHour equal to 0 means in such hour there is not validations
      /* if (countByHour === 0) {
        let rate = 0;
        // in this hour there is no material validations
        results.push(0);
        // keep the rate of the last order for this particual hour
        if (!!lastNotEmptyOrder && Object.prototype.hasOwnProperty.call(lastNotEmptyOrder, 'ProductionRate')) {
          // if we are in the first hour of the shift we will use the next not empty order to get the rate
          if (hour === theVeryFirstShiftHour) {
            rate = Math.ceil((hourValue * firstNotEmptyOrder.ProductionRate) / 60) * CountOperatingStations;
          } else if (hour === theVeryLastShiftHour) {
            rate = Math.ceil((hourValue * lastNotEmptyOrder.ProductionRate) / 60) * CountOperatingStations;
          } else {
            // for the rest of the orders we will use the rate of the last order created
            // check if the next hour has production if it has we use that production rate
            const validationsNextHour = validationResults.filter(
              (result) => result.hour === (hour + 1)
              && result.scanDate === date
            );
            if (!_.isEmpty(validationsNextHour)) {
              rate = Math.ceil((hourValue * validationsNextHour[0].ProductionRate) / 60) * CountOperatingStations;
            } else {
              rate = Math.ceil((hourValue * lastNotEmptyOrder.ProductionRate) / 60) * CountOperatingStations;
            }
          }

          rates.push(rate || 0);
        } else rates.push(0);
      } else if (countByHour === 1) {
        // there is just one order in the shift use the same rate for all shift hours
        const rate = Math.ceil(
          (hourValue * parseInt(validationsPerHour[0].ProductionRate, 10)) / 60
        ) * CountOperatingStations;
        rates.push(rate || 0);
        results.push(validationsPerHour[0].validationResults);
      } else if (countByHour === 2) {
        // when we have just two different material in the same hour
        let minUtcDateScanedMinutes;
        let maxUtcDateScanedMinutes = 0;
        // get the min date of the first barcode scaned, this means it is the first time the order was used
        const maxUtcDateScaned = datefns.parseISO(validationsPerHour[0].maxDate);
        const minUtcDateScaned = datefns.parseISO(validationsPerHour[1].minDate);
        if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
          minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
          maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
        }
        // rate for the first material
        // eslint-disable-next-line max-len
        const firstRate = Math.ceil((parseInt(validationsPerHour[0].ProductionRate, 10) * maxUtcDateScanedMinutes) / hourValue);
        // rate for the last material, because the such hour just two orders were processed
        // eslint-disable-next-line max-len
        const lastRate = Math.floor(((hourValue - minUtcDateScanedMinutes) * parseInt(validationsPerHour[1].ProductionRate, 10)) / hourValue);
        // calculate the total of validation resualts
        // eslint-disable-next-line max-len
        const totalOfValidations = parseInt(validationsPerHour[0].validationResults, 10) + parseInt(validationsPerHour[1].validationResults, 10);
        results.push(totalOfValidations);
        rates.push((firstRate + lastRate) * CountOperatingStations);
      } else {
        // when we have more that two different materials processed in the same hour
        let minUtcDateScanedMinutes = 0;
        let maxUtcDateScanedMinutes = 0;
        let sumMiddleMaterialRates = 0;
        let globalRate = 0;
        let globalValidationResults = 0;
        let sumMiddleValidationResults = 0;
        // eslint-disable-next-line max-len
        // get the min date of the first barcode scaned, this means it is the first time the order was used
        let maxUtcDateScaned = datefns.parseISO(validationsPerHour[0].maxDate);
        let minUtcDateScaned = datefns.parseISO(validationsPerHour[validationsPerHour.length - 1].minDate);
        if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
          minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
          maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
        }
        logger.info(`Current Hour = ${hour}, current hour value = ${hourValue}`);
        // rate for the first material
        let firstRate = 0;
        let lastRate = 0;
        if (hour === theVeryFirstShiftHour) {
          firstRate = Math.ceil(
            ((parseInt(validationsPerHour[0].ProductionRate, 10) * hourValue) / 60)
            * (maxUtcDateScanedMinutes / hourValue)
          );
        } else {
          firstRate = Math.ceil(
            parseInt(validationsPerHour[0].ProductionRate, 10)
            * (maxUtcDateScanedMinutes / hourValue)
          );
        }
        logger.info(`firstRate= ${firstRate}`);
        // rate for the last material, because the such hour just two orders were processed
        if (hour === theVeryLastShiftHour) {
          lastRate = Math.ceil(
            ((parseInt(validationsPerHour[validationsPerHour.length - 1].ProductionRate, 10) * hourValue) / 60)
            * ((hourValue - minUtcDateScanedMinutes) / hourValue)
          );
        } else {
          lastRate = Math.ceil(
            parseInt(validationsPerHour[validationsPerHour.length - 1].ProductionRate, 10)
            * ((hourValue - minUtcDateScanedMinutes) / hourValue)
          );
        }
        logger.info(`lastRate= ${lastRate}`);
        for (let iPerHour = 1; iPerHour < validationsPerHour.length - 1; iPerHour += 1) {
          maxUtcDateScaned = datefns.parseISO(validationsPerHour[iPerHour].maxDate);
          minUtcDateScaned = datefns.parseISO(validationsPerHour[iPerHour - 1].maxDate);
          const difference = differenceInMinutes(maxUtcDateScaned, minUtcDateScaned, { roundingMethod: 'ceil' });
          sumMiddleValidationResults += parseInt(validationsPerHour[iPerHour].validationResults, 10);
          // if the same, it is the same material so it is the same production rate
          sumMiddleMaterialRates += Math.floor(
            (difference / hourValue)
            * parseInt(validationsPerHour[iPerHour].ProductionRate, 10)
          );
        }
        logger.info(`sumMiddleMaterialRates= ${sumMiddleMaterialRates}`);
        // we have different material in the same hour we need to compute the rate based on all materials
        globalRate = firstRate + sumMiddleMaterialRates + lastRate;
        // sume the count of the first order + the count of midlle orders and plus the last order
        globalValidationResults = parseInt(validationsPerHour[0].validationResults, 10)
          + sumMiddleValidationResults
          + parseInt(validationsPerHour[validationsPerHour.length - 1].validationResults, 10);
        results.push(globalValidationResults);
        rates.push(globalRate * CountOperatingStations);
      } */
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
