const { utcToZonedTime } = require('date-fns-tz');
const { logError } = require('../helpers/logger');
const {
  internalServerError, badRequestError,
  getProductionGoal, getProductionRate, getHoursPerShift,
} = require('./core');
const { validateModelId } = require('../models');
const services = require('../services');
const { getHours } = require('date-fns');

function transformLine(productionLine) {
  //let startDateStr;
  //let endDateStr;
  const line = {
    id: productionLine.id,
    lineName: productionLine.lineName,
    stations: [],
    validationResultCount: 0,
    goal: 0,
    rate: 0,
    hour: 0,
  };
  if (Object.prototype.hasOwnProperty.call(productionLine, 'Shifts') && productionLine.Shifts.length > 0) {
    const shift = productionLine.Shifts[0];
    line.shiftId = shift.id;
    line.shiftDescription = shift.shiftDescription;
    //startDateStr = shift.shiftEnd;
    //endDateStr = shift.shiftStart;
  }
  if (Object.prototype.hasOwnProperty.call(productionLine, 'OperatingStations') && productionLine.OperatingStations.length > 0) {
    const stations = [];
    let totalValidationResultCount = 0;

    productionLine.OperatingStations.forEach((e) => {
      const station = e.dataValues;
      totalValidationResultCount += station.validationResultCount;

      stations.push({
        id: station.id,
        identifier: station.stationIdentifier,
        validationResultCount: station.validationResultCount,
        blocked: station.StopCauseLogs.length > 0,
      });
    });
    line.stations = stations;
    line.validationResultCount = totalValidationResultCount;
  }
  //const shiftHours = await services.Shift.getShiftDifferenceInHoursAsync(shiftStart,shiftEnd);
  //let datetime = utcToZonedTime(new Date(), 'America/Mexico_City');
  //const endDateShift = services.Shift.GetShiftEndAsDateTime(datetime,startDateStr,endDateStr);
  //const hours = services.Shift.getShiftDifferenceInHours(datetime,endDateShift);
  const hours = getHoursPerShift(productionLine);
  line.goal = getProductionGoal(productionLine, hours);
  line.rate = getProductionRate(line.validationResultCount, line.goal);
  line.hour = hours;
  return line;
}
async function getProductionLineImpl(line,shiftStart,shiftEnd,shiftId) {
  //const today = utcToZonedTime('2021-07-21 19:21:05.217', 'America/Mexico_City');
  const lineImpl = await services.ProductionLines.getProductionLineImpl(line, shiftStart,shiftEnd,shiftId);
  return transformLine(lineImpl);
}
async function getProductionLine(req, res) {
  try {
    const line = validateModelId(req.params.lineId);
    //let shiftStart = req.params.shiftStart;
    //let shiftEnd = req.params.shiftEnd;
    let shiftId = req.params.shiftId;
    if (!line.isValid) {
     return badRequestError('Invalid parameter passed to getProductionLineImpl', res, line.errorList);
    }
    //const today = utcToZonedTime('2021-07-21 19:21:05.217', 'America/Mexico_City');
    const shiftStart = utcToZonedTime('2021-09-21 13:21:05.217', 'America/Mexico_City');
    const shiftEnd = utcToZonedTime('2021-10-25 13:21:05.217', 'America/Mexico_City');
    //let shiftId = 7;
    const productionLine = await getProductionLineImpl(line,shiftStart,shiftEnd,shiftId);
    //const compliance = await services.ValidationResults.getProductionComplianceImpl(line,shiftStart,shiftEnd,shiftId);
    //productionLine.compliance = compliance;
    return res.json(productionLine);
  } catch (error) {
    logError('Error in getProductionLine', error);
    return internalServerError('Internal server error', res);
  }
}
async function getProductionLines(req, res) {
  try {
    const customer = validateModelId(req.params.customerId);
    if (!customer.isValid) {
      return badRequestError('Invalid parameter', res, customer.errorList);
    }
    const today = utcToZonedTime(new Date(), 'America/Mexico_City');
    // eslint-disable-next-line max-len
    const productionlines = await services.ProductionLines.getProductionLineByCustomerIdAndShift(customer.id, today);
    return res.json(productionlines);
  } catch (error) {
    logError('Error in getProductionLines', error);
    return internalServerError('Internal server error', res);
  }
}

async function getProductionCompliance(req, res) {
  try {
    const today = utcToZonedTime('2021-07-21 19:21:05.217Z', 'America/Mexico_City');
    const line = validateModelId(req.params.lineId);
    if (!line.isValid) {
      return badRequestError('Invalid parameter', res, line.errorList);
    }
    // eslint-disable-next-line max-len
    const validationResults = await services.ValidationResults.getProductionComplianceImpl(line, today);
    return res.json(validationResults);
  } catch (error) {
    logError('Error in getProductionCompliance', error);
    return internalServerError('Internal server error', res);
  }
}

async function getCurrentShift(req, res){
  try{
    const line = validateModelId(req.params.lineId);
    if(!line.isValid){
      return badRequestError('Invalid parameter', res, line.errorList);
    }
    const currentShift = await services.Shift.getCurrentShift(line.id);
    return res.json(currentShift);
  } catch(error){
    logError('Error in getCurrentShift', error);
    return internalServerError('Internal server error',res);
  }
}

module.exports.getCurrentShift = getCurrentShift;
module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionCompliance = getProductionCompliance;