const { logError, logMessage } = require('../helpers/logger');
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

async function getProductionLinesPerCustomerCurrentShift(req, res) {
  try {
    const customer = models.validateModelId(req.params.customerId);
    if (!customer.isValid) {
      return badRequestError('Invalid parameter passed', res, customer.errorList);
    }
    const lines = [];
    const lineResults = [];
    const productionLines = await services.ProductionLines.getProductionLinesAndShiftsByCustomer(customer.id);
    console.log(productionLines);
    if (libs.isArray(productionLines) && !!productionLines) {
      // eslint-disable-next-line no-restricted-syntax
      for (const entry of productionLines) {
        lineResults.push(services.ProductionLines.getLineStatsByLineIdAndShift(
          entry.ProductionLineId,
          entry.ShiftEndStr,
          entry.ShiftStartStr,
          customer.id,
          entry.ShiftId
        ));
      }
      // await all calls
      await Promise.all(lineResults);
      for (let index = 0; index < lineResults.length; index++) {
        const element = lineResults[index];
        if (libs.isArray(lineResults[index]) && lineResults[index].length > 0) {
          services.ProductionLines.formatProductionLineLiveStats(lines, element, lineResults);
        } else {
          logMessage('NO ROWS FOUND', 'The Production Line does not have scanned material in the current shift');
          services.ProductionLines.transformProductionLineDefault(lines, element);
        }
      }
    }
    return res.json(lines);
  } catch (error) {
    logError('Error in getProductionLinesPerCustomerCurrentShift', error);
    return internalServerError('Internal server error', res);
  }
}
module.exports.getProductionLinesPerCustomerCurrentShift = getProductionLinesPerCustomerCurrentShift;
module.exports.getProductionLinesPerCustomer = getProductionLinesPerCustomer;
module.exports.getProductionLines = getProductionLines;
module.exports.getProductionLine = getProductionLine;
