const { Op } = require('sequelize');
const { sequelize, getDatePartConversion } = require('../helpers/sequelize');
const { logError, logMessage } = require('../helpers/logger');
const {
  ValidationResult, Material, OperatingStation, Order, Shift, validateReportParameters,
  validatePaginationPage, ProductionLine,
} = require('../models');
const { badRequestError, internalServerError } = require('./core');

const LIMIT = 10;
function calculatePaginationOffset(page) {
  const validate = validatePaginationPage(page);
  if (!validate.isValid) {
    return 0;
  }
  return (page * LIMIT) - LIMIT;
}
function createPasPnQuery(payload) {
  const where = { };
  if (Object.prototype.hasOwnProperty.call(payload, 'pasPN')) {
    where.pasPN = payload.pasPN;
  }
  return where;
}
function createDateWhereQuery(payload) {
  const where = { };
  if (Object.prototype.hasOwnProperty.call(payload, 'scanDate')) {
    where[Op.and] = [
      sequelize.where(getDatePartConversion('ScanDate'), '>=', payload.scanDate.from),
      sequelize.where(getDatePartConversion('ScanDate'), '<=', payload.scanDate.to),
    ];
  }
  return where;
}
function getScannedReportImpl(report) {
  const dateWhere = createDateWhereQuery(report);
  const pasWhere = createPasPnQuery(report);
  const query = {
    attributes: ['id', 'scanDate'],
    include: [{
      model: OperatingStation,
      attributes: ['stationIdentifier'],
    }, {
      model: Material,
      where: pasWhere,
      attributes: ['pasPN'],
    }, {
      model: Order,
      attributes: ['orderIdentifier'],
      include: [{
        model: Shift,
        attributes: ['shiftDescription'],
      },
      {
        model: ProductionLine,
        attributes: ['LineName'],
      }],
    }],
    where: dateWhere,
    order: [
      ['id', 'DESC']
    ],
  };
  return query;
}
async function getPaginatedScannedReportList(req, res) {
  try {
    const report = validateReportParameters(req.body);
    if (!report.isValid) {
      return badRequestError('The report schema is not valid', res, report.errorList);
    }
    const query = getScannedReportImpl(report);
    query.limit = LIMIT;
    query.offset = calculatePaginationOffset(req.params.page);

    const result = await ValidationResult.findAndCountAll(query);
    result.currentPage = parseInt(req.params.page, 10);
    result.totalPages = Math.ceil(result.count / 10);
    logMessage('getPaginatedReportList consumed', req.body);

    return res.json(result);
  } catch (error) {
    logError('Error in getPaginatedReportList', error);
    return internalServerError('Internal server error', res);
  }
}

async function getScannedReportList(req, res) {
  try {
    const report = validateReportParameters(req.body);
    if (!report.isValid) {
      return badRequestError('The report schema is not valid', res, report.errorList);
    }
    const query = getScannedReportImpl(report);
    query.raw = true;
    const result = await ValidationResult.findAll(query);
    logMessage('getScannedReportList consumed', req.body);

    return res.json(result);
  } catch (error) {
    logError('Error in getScannedReportList', error);
    return internalServerError('Internal server error', res);
  }
}
module.exports.getPaginatedScannedReportList = getPaginatedScannedReportList;
module.exports.getScannedReportList = getScannedReportList;
