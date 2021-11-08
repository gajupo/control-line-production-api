const { utcToZonedTime } = require('date-fns-tz');
const { logError } = require('../helpers/logger');
const {
  internalServerError, badRequestError, getHoursPerShift,
  getProductionGoal, getProductionRate,
} = require('./core');
const { validateModelId, validateLinesDashboradParams } = require('../models');
const services = require('../services');

function transformLine(productionLine) {
  const line = {
    id: productionLine.id,
    lineName: productionLine.lineName,
    stations: [],
    validationResultCount: 0,
    goal: 0,
    rate: 0,
  };
  if (Object.prototype.hasOwnProperty.call(productionLine, 'Shifts') && productionLine.Shifts.length > 0) {
    const shift = productionLine.Shifts[0];
    line.shiftId = shift.id;
    line.shiftDescription = shift.shiftDescription;
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
  const shiftHours = getHoursPerShift(productionLine);
  line.goal = getProductionGoal(productionLine, shiftHours);
  line.rate = getProductionRate(line.validationResultCount, line.goal);

  return line;
}
async function getProductionLineImpl(line) {
  const today = utcToZonedTime('2021-07-21 19:21:05.217', 'America/Mexico_City');
  const lineImpl = await services.ProductionLines.getProductionLineImpl(line, today);
  return transformLine(lineImpl);
}
async function getProductionLine(reqParams, res) {
  try {
    const parameters = validateLinesDashboradParams(reqParams);
    if (!parameters.isValid) {
      return badRequestError('Invalid parameters passed to getProductionLineImpl', res, parameters.errorList);
    }
    const validationsPerLine = await services.ValidationResults.getValidationResultsPerLine(reqParams);
    const validationsTransformed = services
      .ValidationResults
      .computeLineDashboardProductionLive(validationsPerLine, reqParams);
    const validationsPerHourTransformed = services
      .ValidationResults
      .joinValidationsAndProductionRate(
        validationsPerLine,
        reqParams.ShiftStartStr,
        reqParams.ShiftEndStr,
        reqParams.ShiftStartedDateTime
      );
    validationsTransformed.chartData = validationsPerHourTransformed;

    return res.json(validationsTransformed);
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
    // eslint-disable-next-line max-len
    const productionlines = await services.ProductionLines.getProductionLinesAndShiftsByCustomer(customer.id);
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

module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
module.exports.getProductionCompliance = getProductionCompliance;
