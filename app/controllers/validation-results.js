const _ = require('lodash');
const { utcToZonedTime } = require('date-fns-tz');
const { Sequelize, Op } = require('sequelize');
const { logError, logger, logMessage } = require('../helpers/logger');
const { internalServerError } = require('./core');
const services = require('../services');
const libs = require('../helpers/lib');
const { getDatePartConversion } = require('../helpers/sequelize');
const {
  Order, Material, validateHourByHourReportParams, badRequestError,
} = require('../models');
/**
 * @description
 * Return an object with all shift hours, goals and scanned materials by hour,
 * productionRates is equal to goal or the total of validations that user should perform in a specific hour and material
 * validationResults is the total of scanned material by hour,
 * hours is the list of shift hours from start shift time to the end shift time
 * @param {*} req
 * @param {*} res
 * @returns {*} Object
 * @example
 * {productionRates[150,300,300,...],hours[15,16,17,...],validationResults[100,100,300,...]}
 */
async function getValidationResultsPerHour(req, res) {
  try {
    // validate incomming request parameters
    const reportBodyParams = validateHourByHourReportParams(req.body);
    if (!reportBodyParams.isValid) {
      return badRequestError('Invalid parameter passed', res, reportBodyParams.errorList);
    }
    const params = req.body;
    // get all orders by shift and gropued by hour, line, customer, material and report date
    const productionPerHour = await services.ValidationResults.getValidationResultsPerHourImpl(params);
    // if the is no validations just return an empty object
    if (_.isEmpty(productionPerHour)) {
      const emptyResult = {
        hours: [],
        validationResults: [],
        productionRates: [],
      };
      return res.json(emptyResult);
    }
    // calculate rate and scanned materials by hour
    const joined = services.ValidationResults.joinValidationsAndProductionRate(
      productionPerHour,
      params.shiftStart,
      params.shiftEnd,
      params.date
    );
    /**
     * productionRates is equal to goal or the total of validations that user should perform in a specific hour and material
     * joined: {productionRates[],hours[],validationResults[]}
     */
    return res.json(joined);
  } catch (error) {
    logError('Error in getValidationResultsPerHour', error);
    return internalServerError('Internal server error', res);
  }
}
// eslint-disable-next-line no-unused-vars
async function getProductionRatePerHourImpl(params) {
  const today = utcToZonedTime(params.date, 'America/Mexico_City');
  const productionRates = await Order.findAll({
    attributes: [
      [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')), 'hour'],
      [Sequelize.fn('SUM', Sequelize.col('Material.ProductionRate')), 'productionRatesSum'],
    ],
    include: [{
      model: Material,
      required: true,
      attributes: [],
    }],
    where: {
      [Op.and]: [
        Sequelize.where(Sequelize.col('Order.ShiftId'), '=', params.shiftId),
        Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
        Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today),
      ],
    },
    group: [
      Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')),
      'Material.ID',
      'Material.ProductionRate',
    ],
    raw: true,
  });
  return productionRates;
}
/**
 * @description
 * * gets from the db all customers and its productions lines for the current shift detected.
 * * It will also calculate goal, rates, scanned materials for every customer and its production lines.
 * * The returned array will be used on generic dashboard intended to show all running line in one place
 * @param {*} req
 * @param {*} res
 * @returns object array
 * @example
 */
async function getAllCustomersProductionLinesCurrentShift(req, res) {
  try {
    const linesInformation = [];
    const lineResultsPromises = [];
    let lineResults = [];
    // execute sql query to the db
    const productionLines = await services.ProductionLines.getAllCustomersProductionLines();
    logger.debug('Production line by customer = %o', productionLines);
    if (libs.isArray(productionLines) && !!productionLines) {
      // eslint-disable-next-line no-restricted-syntax
      for (const lineInfo of productionLines) {
        lineResultsPromises.push(services.ValidationResults.getValidationResultsPerLine(lineInfo));
      }
      // await all calls
      lineResults = await Promise.all(lineResultsPromises);
      for (let index = 0; index < lineResults.length; index++) {
        const lineProduction = _.without(lineResults[index], 'lineInfo');
        // eslint-disable-next-line prefer-destructuring
        const lineInfo = lineResults[index].lineInfo;
        logger.debug('Orders by line =%o', lineResults);
        if (!_.isEmpty(lineResults[index])) {
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
    logError('Error in getProductionLinesPerCustomerCurrentShift', error);
    return internalServerError(
      Object.prototype.hasOwnProperty.call(error, 'message') ? error.message : error,
      res
    );
  }
}
module.exports.getValidationResultsPerHour = getValidationResultsPerHour;
module.exports.getAllCustomersProductionLinesCurrentShift = getAllCustomersProductionLinesCurrentShift;
