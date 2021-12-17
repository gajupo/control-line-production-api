const _ = require('lodash');
const { utcToZonedTime } = require('date-fns-tz');
const { logError } = require('../helpers/logger');
const { internalServerError, badRequestError } = require('./core');
const { validateModelId, validateLinesDashboradParams } = require('../models');
const services = require('../services');
/**
 * Performs all queries and calcultation used for line panel dashboard for a give line
 * @param {*} reqParams
 * @param {*} res
 * @returns An object with line information, goals, rates and total of validations
 */
async function getProductionLine(reqParams, res) {
  try {
    const parameters = validateLinesDashboradParams(reqParams);
    if (!parameters.isValid) {
      return badRequestError('Invalid parameters passed to getProductionLineImpl', res, parameters.errorList);
    }
    // get all production information for the given line, it performs a sql query
    const validationsPerLine = await services.ValidationResults.getValidationResultsPerLine(reqParams);
    // check if we have production
    if (_.isEmpty(validationsPerLine)) {
      return res.json([]);
    }
    // returns all data for the goal, achievable goal, current production, production by station
    const validationsTransformed = services.ValidationResults
      .computeLineDashboardProductionLive(validationsPerLine, reqParams);
    // gets rates, goals and hours to be shown in the bar chart
    const validationsPerHourTransformed = services.ValidationResults
      .joinValidationsAndProductionRate(
        validationsPerLine,
        reqParams.ShiftStartStr,
        reqParams.ShiftEndStr,
        reqParams.ShiftStartedDateTime
      );
    // set the data for the bar chart on line dashboard
    validationsTransformed.chartData = validationsPerHourTransformed;

    return res.json(validationsTransformed);
  } catch (error) {
    logError('Error in getProductionLine', error);
    return internalServerError('Internal server error', res);
  }
}
/**
 * Returns a list of lines and its current shift for a given customer
 * @param {*} req
 * @param {*} res
 * @returns An array of objects
 */
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
