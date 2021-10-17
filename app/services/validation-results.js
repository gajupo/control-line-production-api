const { Sequelize, Op, QueryTypes } = require('sequelize');
const { utcToZonedTime, format, zonedTimeToUtc } = require('date-fns-tz');
const { isValid, getMinutes } = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const { sequelize } = require('../helpers/sequelize');
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
    const shiftStartDateTime = utcToZonedTime(params.date, 'America/Mexico_City');
    const dateTimeShiftEnd = shiftServices.GetShiftEndAsDateTime(
      shiftStartDateTime, params.shiftStart, params.shiftEnd
    );
    const pattern = 'yyyy-MM-dd HH:mm:ss';
    console.log(shiftStartDateTime);
    console.log(dateTimeShiftEnd);
    const validations = await sequelize.query(
      `select 
            count(ValidationResults.id) as validationResults,
            DATEPART(HOUR, ValidationResults.ScanDate) as hour,
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
            GROUP BY DATEPART(HOUR, ValidationResults.ScanDate), ValidationResults.OrderIdentifier,Materials.ProductionRate`,
      {
        bind: {
          startdate: format(shiftStartDateTime, pattern),
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
function joinValidationsAndProductionRate(validationResults, shiftStartStr, shiftEndStr) {
  const adjustedShiftStart = shiftServices.getShiftHour(shiftStartStr);
  const adjustedShiftEnd = shiftServices.getShiftHour(shiftEndStr);
  const hours = [];
  const results = [];
  const rates = [];
  const hourValue = 60;
  // eslint-disable-next-line max-len
  // we need the first order to get the production rate in case some hours does not have production,
  // but however we need to put some production rate
  const firstOrder = validationResults[validationResults.length - 1];
  // loop from the first hour of the shift to last one
  // TODO: agrupar por hora y fecha, procesar cada grupo por separado
  // TODO: validar si el inicio y fin del turno no es a al minuto 0, tomar lo que corresponda,
  // por ejemplo el turno puede iniciar al 06:30:00, de la hora 6 solo tomar 30m
  for (let i = adjustedShiftStart; i <= adjustedShiftEnd; i += 1) {
    hours.push(i);
    const countByHour = validationResults.filter((result) => result.hour === i).length;
    // get all materials processed by the current hour
    const validations = validationResults.filter((result) => result.hour === i);

    if (countByHour === 0) {
      // in this hour there is no material validations
      results.push(0);
      // firstOrder.hasOwnProperty('ProductionRate')
      if (!!firstOrder && Object.prototype.hasOwnProperty.call(firstOrder, 'ProductionRate')) rates.push(firstOrder.ProductionRate || 0);
      else rates.push(0);
    } else if (countByHour === 1) {
      rates.push(firstOrder.ProductionRate || 0);
      results.push(validations[0].validationResults);
    } else if (countByHour === 2) {
      // when we have just two different material in the same hour
      // get worked minutes
      let minUtcDateScanedMinutes;
      let maxUtcDateScanedMinutes = 0;
      // eslint-disable-next-line max-len
      // get the min date of the first barcode scaned, this means it is the first time the order was used
      const maxUtcDateScaned = zonedTimeToUtc(validations[0].maxDate, 'America/Mexico_City');
      const minUtcDateScaned = zonedTimeToUtc(validations[1].minDate, 'America/Mexico_City');
      if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
        minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
        maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
      }
      // rate for the first material
      // eslint-disable-next-line max-len
      const firstRate = Math.ceil((parseInt(validations[0].ProductionRate, 10) * maxUtcDateScanedMinutes) / hourValue);
      // rate for the last material, because the such hour just two orders were processed
      // eslint-disable-next-line max-len
      const lastRate = Math.ceil(((hourValue - minUtcDateScanedMinutes) * parseInt(validations[1].ProductionRate, 10)) / hourValue);
      // calculate the total of validation resualts
      // eslint-disable-next-line max-len
      const totalOfValidations = parseInt(validations[0].validationResults, 10) + parseInt(validations[1].validationResults, 10);
      results.push(totalOfValidations);
      rates.push(firstRate + lastRate);
    } else {
      // when we have more that two different materials processed in the same hour
      // get worked minutes
      let minUtcDateScanedMinutes = 0;
      let maxUtcDateScanedMinutes = 0;
      let sumMiddleMaterialRates = 0;
      let globalRate = 0;
      let globalValidationResults = 0;
      let sumMiddleValidationResults = 0;
      // eslint-disable-next-line max-len
      // get the min date of the first barcode scaned, this means it is the first time the order was used
      let maxUtcDateScaned = zonedTimeToUtc(validations[0].maxDate, 'America/Mexico_City');
      let minUtcDateScaned = zonedTimeToUtc(validations[validations.length - 1].minDate, 'America/Mexico_City');
      // check if all order scanned the same material
      const countSameProductionRate = validations.filter(
        (result) => result.ProductionRate === validations[0].ProductionRate
      ).length;

      if (isValid(minUtcDateScaned) && isValid(maxUtcDateScaned)) {
        minUtcDateScanedMinutes = getMinutes(minUtcDateScaned);
        maxUtcDateScanedMinutes = getMinutes(maxUtcDateScaned);
      }
      // rate for the first material
      const firstRate = Math.ceil(
        (parseInt(validations[0].ProductionRate, 10) * maxUtcDateScanedMinutes) / hourValue
      );
      // rate for the last material, because the such hour just two orders were processed
      // eslint-disable-next-line max-len
      const lastRate = Math.ceil(((hourValue - minUtcDateScanedMinutes) * parseInt(validations[validations.length - 1].ProductionRate, 10)) / hourValue);
      for (let index = 1; index < validations.length - 1; index += 1) {
        maxUtcDateScaned = zonedTimeToUtc(validations[index].maxDate, 'America/Mexico_City');
        minUtcDateScaned = zonedTimeToUtc(validations[index].minDate, 'America/Mexico_City');
        const difference = differenceInMinutes(maxUtcDateScaned, minUtcDateScaned, { roundingMethod: 'ceil' });
        console.log(difference);
        console.log(parseInt(validations[index].ProductionRate, 10));
        console.log(sumMiddleMaterialRates);
        sumMiddleValidationResults += parseInt(validations[index].validationResults, 10);
        // if the same, it is the same material so it is the same production rate
        if (countSameProductionRate !== countByHour) {
          sumMiddleMaterialRates += Math.floor(
            (difference * parseInt(validations[index].ProductionRate, 10)) / hourValue
          );
        }
      }
      console.log(`first order results = ${validations[0].validationResults}`);
      console.log(`Last order results = ${validations[validations.length - 1].validationResults}`);
      if (countSameProductionRate === countByHour) {
        globalRate = validations[0].ProductionRate;
      } else {
        globalRate = firstRate + sumMiddleMaterialRates + lastRate;
      }
      globalValidationResults = parseInt(validations[0].validationResults, 10)
      + sumMiddleValidationResults
      + parseInt(validations[validations.length - 1].validationResults, 10);
      results.push(globalValidationResults);
      rates.push(globalRate);
    }
  }
  const joined = {
    // eslint-disable-next-line object-shorthand
    hours: hours,
    validationResults: results,
    productionRates: rates,
  };
  return joined;
}
module.exports.getProductionComplianceImpl = getProductionComplianceImpl;
module.exports.getValidationResultsPerHourImpl = getValidationResultsPerHourImpl;
module.exports.joinValidationsAndProductionRate = joinValidationsAndProductionRate;
