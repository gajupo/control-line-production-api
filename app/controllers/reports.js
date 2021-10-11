'use strict';

const { Op } = require("sequelize");

const { sequelize, getDatePartConversion } = require("../helpers/sequelize");
const { logError, logMessage } = require('../helpers/logger');
const { ValidationResult, Material, OperatingStation, Order, Shift, validateReportParameters,
    validatePaginationPage,ProductionLine } = require("../models");
const { badRequestError, internalServerError } = require("./core");

async function getPaginatedScannedReportList(req, res) {

    try {
        const report = validateReportParameters(req.body);
        if (!report.isValid) {
            return badRequestError("The report schema is not valid", res, report.errorList);
        }
        let query = getScannedReportImpl(report);
        query.limit = LIMIT;
        query.offset = calculatePaginationOffset(req.params.page);

        var result = await ValidationResult.findAndCountAll(query);
        result.currentPage = parseInt(req.params.page);
        result.totalPages = Math.ceil(result.count / 10);
        logMessage("getPaginatedReportList consumed", req.body);

        return res.json(result);
    }
    catch(error) {
        logError("Error in getPaginatedReportList", error);
        return internalServerError("Internal server error", res);
    }
}

async function getScannedReportList(req, res) {
    try {
        const report = validateReportParameters(req.body);
        if (!report.isValid) {
            return badRequestError("The report schema is not valid", res, report.errorList);
        }
        const query = getScannedReportImpl(report);
        query.raw = true;
        const result = await ValidationResult.findAll(query);
        logMessage("getScannedReportList consumed", req.body);

        return res.json(result);
    }
    catch (error) {
        logError("Error in getScannedReportList", error);
        return internalServerError("Internal server error", res);
    }
} 

function getScannedReportImpl(report) {
    const dateWhere = createDateWhereQuery(report);
    const pasWhere = createPasPnQuery(report);
    const query = {
        attributes: ['id', 'scanDate'],
        include: [{
                model: OperatingStation,
                attributes: ['stationIdentifier']
            }, {
                model: Material,
                where: pasWhere,
                attributes: ['pasPN']
            }, {
                model: Order,
                attributes: ['orderIdentifier'],
                include: [{
                    model: Shift,
                    attributes: ['shiftDescription']
                },
                {
                    model: ProductionLine,
                    attributes: ['LineName']
                }],
            }
        ],
        where: dateWhere
    };
    return query
}

function createDateWhereQuery(payload) {

    var where = { };
    if (payload.hasOwnProperty('scanDate')) {
        where[Op.and] = [
            sequelize.where(getDatePartConversion('ScanDate'), '>=', payload.scanDate.from),
            sequelize.where(getDatePartConversion('ScanDate'), '<=', payload.scanDate.to),
        ]
    }
    return where;
}

function createPasPnQuery(payload) {

    var where = { };
    if (payload.hasOwnProperty('pasPN')) {
        where.pasPN = payload.pasPN;
    }
    return where;
}

function calculatePaginationOffset(page) {

    const validate = validatePaginationPage(page);
    if (!validate.isValid) {
        return 0;
    }
    return (page * LIMIT) - LIMIT;
}

const LIMIT = 10;

module.exports.getPaginatedScannedReportList = getPaginatedScannedReportList;
module.exports.getScannedReportList = getScannedReportList;
