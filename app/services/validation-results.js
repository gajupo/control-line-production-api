const _ = require('lodash');
const datefns = require('date-fns');
const { Sequelize, Op, QueryTypes } = require('sequelize');
const { utcToZonedTime, zonedTimeToUtc } = require('date-fns-tz');
const { isValid, getMinutes } = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const { sequelize, getDatePartConversion } = require('../helpers/sequelize');
const models = require('../models');
const shiftServices = require('./shift');

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
    const shiftStartDateTime = shiftServices.GetShiftStartAsDateTime(reportDate.toISOString(), params.shiftStart);
    const dateTimeShiftEnd = shiftServices.GetShiftEndAsDateTime(
      reportDate.toISOString(), params.shiftStart, params.shiftEnd
    );
    const validations = await sequelize.query(
      `select 
        count(ValidationResults.id) as validationResults,
        DATEPART(HOUR, ValidationResults.ScanDate) as hour,
        convert(varchar, min(ValidationResults.ScanDate), 23) as scanDate,
        min(ValidationResults.ScanDate) as minDate,
        max(ValidationResults.ScanDate) as maxDate,
        DATEPART(minute,min(ValidationResults.ScanDate)) as minMinute,
        DATEDIFF(SECOND,min(ValidationResults.ScanDate),max(ValidationResults.ScanDate)) as usedSeconds, 
        ValidationResults.OrderIdentifier,
        Materials.ProductionRate
      from ValidationResults
        inner join Materials on Materials.ID = ValidationResults.MaterialId
        inner join Orders on Orders.Id = ValidationResults.OrderId and Orders.ProductionLineId = $productionLineId and Orders.ShiftId = $shiftId
      where 
        CONVERT(date, ValidationResults.ScanDate) >= $startdate and CONVERT(date, ValidationResults.ScanDate) <= $enddate and ValidationResults.CustomerId = $customerId 
        GROUP BY DATEPART(HOUR, ValidationResults.ScanDate), ValidationResults.OrderIdentifier,Materials.ProductionRate 
        ORDER BY convert(varchar, min(ValidationResults.ScanDate), 23)`,
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

function joinValidationsAndProductionRate(validationResults, shiftStart, shiftEnd, reportDate) {
  const hours = [];
  const results = [];
  const rates = [];
  const hourValue = 60;
  const uniqueDateList = [];
  // eslint-disable-next-line max-len
  // we need the last order to get the production rate in case some hours does not have production,
  // but however we need to put some production rate
  const lastOrder = validationResults[validationResults.length - 1];
  const paramDate = zonedTimeToUtc(reportDate, 'America/Mexico_City');
  const shiftStartDate = shiftServices.GetShiftStartAsDateTime(paramDate.toISOString(), shiftStart);
  const shiftEndDate = shiftServices.GetShiftEndAsDateTime(paramDate.toISOString(), shiftStart, shiftEnd);
  const totalShiftHours = shiftServices.getShiftDifferenceInHours(shiftEndDate, shiftStartDate);
  // if start and date are not in the same day, we will look for hours in the next day starting by 0 = 12 AM
  if (!datefns.isSameDay(datefns.parseISO(shiftEndDate), datefns.parseISO(shiftStartDate))) {
    uniqueDateList.push(datefns.format(datefns.parseISO(shiftStartDate), 'yyyy-MM-dd'));// current day
    uniqueDateList.push(datefns.format(datefns.parseISO(shiftEndDate), 'yyyy-MM-dd'));// next day
  } else {
    // start and end shift is in the same day
    uniqueDateList.push(datefns.format(datefns.parseISO(shiftStartDate), 'yyyy-MM-dd'));
  }
  // get first hour the shift
  let theVeryfirstHour = shiftServices.getShiftHour(shiftStart);
  const dayLastHour = 24;
  let shiftLastHour = 0;
  for (let index = 0; index < uniqueDateList.length; index++) {
    const date = uniqueDateList[index];
    // the shift will start in current day and ends in the next one, that is why we iterate until 23 hour for the current date
    if (index === 0 && uniqueDateList.length > 1) {
      shiftLastHour = dayLastHour;
    } else if (index === 0 && uniqueDateList.length === 1) {
      // start and end shift is in the same day
      shiftLastHour = (theVeryfirstHour + totalShiftHours) + 1;
    } else if (index > 0 && uniqueDateList.length >= 1) {
      // iterate for reamining hours for next day shift
      shiftLastHour = ((theVeryfirstHour + totalShiftHours) - dayLastHour) + 1;
      // restart the hour counter to start in 0 for the next day
      theVeryfirstHour = 0;
    }
    for (let hour = theVeryfirstHour; hour < shiftLastHour; hour++) {
      // every hour that will be shown on the chart
      hours.push(hour);
      // get the count for validation by hour and date
      const countByHour = validationResults.filter((result) => result.hour === hour && result.scanDate === date).length;
      // get all materials processed by the current hour and date
      const validationsPerHour = validationResults.filter((result) => result.hour === hour && result.scanDate === date);
      // if countByHour equal to 0 means in such hour there is any validation
      if (countByHour === 0) {
        // in this hour there is no material validations
        results.push(0);
        // keep the rate of the last order for this particual hour
        if (!!lastOrder && Object.prototype.hasOwnProperty.call(lastOrder, 'ProductionRate')) rates.push(lastOrder.ProductionRate || 0);
        else rates.push(0);
      } else if (countByHour === 1) {
        // there is just one order in the shift use the same rate for all shift hours
        rates.push(lastOrder.ProductionRate || 0);
        results.push(validationsPerHour[0].validationResults);
      } else if (countByHour === 2) {
        // when we have just two different material in the same hour
        let minUtcDateScanedMinutes;
        let maxUtcDateScanedMinutes = 0;
        // get the min date of the first barcode scaned, this means it is the first time the order was used
        const maxUtcDateScaned = zonedTimeToUtc(validationsPerHour[0].maxDate, 'America/Mexico_City');
        const minUtcDateScaned = zonedTimeToUtc(validationsPerHour[1].minDate, 'America/Mexico_City');
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
        rates.push(firstRate + lastRate);
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
        let maxUtcDateScaned = zonedTimeToUtc(validationsPerHour[0].maxDate, 'America/Mexico_City');
        let minUtcDateScaned = zonedTimeToUtc(validationsPerHour[validationsPerHour.length - 1].minDate, 'America/Mexico_City');
        // check if all order scanned the same material
        const countSameProductionRate = validationsPerHour.filter(
          (result) => result.ProductionRate === validationsPerHour[0].ProductionRate
        ).length;
        if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
          minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
          maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
        }
        // rate for the first material
        const firstRate = Math.ceil(
          (parseInt(validationsPerHour[0].ProductionRate, 10) * maxUtcDateScanedMinutes) / hourValue
        );
          // rate for the last material, because the such hour just two orders were processed
          // eslint-disable-next-line max-len
        const lastRate = Math.ceil(((hourValue - minUtcDateScanedMinutes) * parseInt(validationsPerHour[validationsPerHour.length - 1].ProductionRate, 10)) / hourValue);
        for (let iPerHour = 1; iPerHour < validationsPerHour.length - 1; iPerHour += 1) {
          maxUtcDateScaned = zonedTimeToUtc(validationsPerHour[iPerHour].maxDate, 'America/Mexico_City');
          minUtcDateScaned = zonedTimeToUtc(validationsPerHour[iPerHour].minDate, 'America/Mexico_City');
          const difference = differenceInMinutes(maxUtcDateScaned, minUtcDateScaned, { roundingMethod: 'ceil' });
          sumMiddleValidationResults += parseInt(validationsPerHour[iPerHour].validationResults, 10);
          // if the same, it is the same material so it is the same production rate
          if (countSameProductionRate !== countByHour) {
            sumMiddleMaterialRates += Math.floor(
              (difference * parseInt(validationsPerHour[iPerHour].ProductionRate, 10)) / hourValue
            );
          }
        }
        // if there is more than two orders but the material scanne is the same, we could use the same rate as last order
        if (countSameProductionRate === countByHour) {
          globalRate = validationsPerHour[0].ProductionRate;
        } else {
          // we have different material in the same hour we need to compute the rate based on all materials
          globalRate = firstRate + sumMiddleMaterialRates + lastRate;
        }
        // sume the count of the first order + the count of midlle orders and plus the last order
        globalValidationResults = parseInt(validationsPerHour[0].validationResults, 10)
          + sumMiddleValidationResults
          + parseInt(validationsPerHour[validationsPerHour.length - 1].validationResults, 10);
        results.push(globalValidationResults);
        rates.push(globalRate);
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
