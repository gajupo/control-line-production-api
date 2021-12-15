const _ = require('lodash');
const datefns = require('date-fns');
const { utcToZonedTime } = require('date-fns-tz');
const { logError, logMessage, logger } = require('../helpers/logger');
const services = require('../services');
const libs = require('../helpers/lib');
const { internalServerError, badRequestError } = require('./core');
const models = require('../models');

async function getProductionLines(res) {
  try {
    const productionlines = services.ProductionLines.getProductionLines();
    return res.json(productionlines);
  } catch (error) {
    logError('Error in getProductionLines', error);
    return internalServerError('Internal server error', res);
  }
}

async function getProductionLine(lineId) {
  try {
    const productionLine = await services.ProductionLines.getProductionLineById(lineId);
    return productionLine;
  } catch (error) {
    logError('Error in getProductionLines', error);
    return internalServerError('Internal server error', error);
  }
}

async function getProductionLinesPerCustomer(req, res) {
  try {
    const customer = models.validateModelId(req.params.customerId);
    if (!customer.isValid) {
      return badRequestError('Invalid parameter passed', res, customer.errorList);
    }
    const productionLines = await services.ProductionLines.getProductionLinesPerCustomer(customer.id);
    return res.json(productionLines);
  } catch (error) {
    logError('Error in getProductionLinesPerCustomer', error);
    return internalServerError('Internal server error', res);
  }
}
/**
 * Controlls and returns all information for general dashboards
 * @param {*} req
 * @param {*} res
 * @returns An array of objects, every object is a production line with its goal, rate and validations
 */
async function getProductionLinesPerCustomerCurrentShift(req, res) {
  try {
    const customer = models.validateModelId(req.params.customerId);
    if (!customer.isValid) {
      return badRequestError('Invalid parameter passed', res, customer.errorList);
    }
    const linesInformation = [];
    const lineResultsPromises = [];
    let lineResults = [];
    const productionLines = await services.ProductionLines.getProductionLinesAndShiftsByCustomer(customer.id);
    if (_.isEmpty(productionLines)) {
      return res.json(linesInformation);
    }
    logger.debug('Production line by customer = %o', productionLines);
    if (libs.isArray(productionLines) && !!productionLines) {
      // eslint-disable-next-line no-restricted-syntax
      for (const lineInfo of productionLines) {
        lineResultsPromises.push(services.ValidationResults.getValidationResultsPerLine(lineInfo));
      }
      // await all calls
      lineResults = await Promise.all(lineResultsPromises);
      if (_.isEmpty(lineResults[0])) return res.json({});
      for (let index = 0; index < lineResults.length; index++) {
        const lineProduction = _.without(lineResults[index], 'lineInfo');
        // eslint-disable-next-line prefer-destructuring
        const lineInfo = lineResults[index].lineInfo;
        logger.debug('Orders by line =%o', lineResults);
        if (libs.isArray(lineResults[index]) && lineResults[index].length > 0) {
          // calculate rate and scanned materials by hour
          linesInformation.push(services.ValidationResults.computeLineProductionLive(lineProduction, lineInfo));
        } else {
          logMessage('NO ROWS FOUND', 'The Production Line does not have scanned material in the current shift');
          linesInformation.push(services.ProductionLines.transformProductionLineDefault(lineInfo));
        }
      }
    }
    logger.debug('Lines live stats=%o', linesInformation);
    return res.json(linesInformation);
  } catch (error) {
    logError('Error in getProductionLinesPerCustomerCurrentShift', error.stack);
    return internalServerError('Internal server error', res);
  }
}
module.exports.getProductionLinesPerCustomerCurrentShift = getProductionLinesPerCustomerCurrentShift;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
