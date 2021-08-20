'use strict';

const { Op } = require("sequelize");

const { sequelize, getDatePartConversion } = require("../helpers/sequelize");
const { logError, logMessage } = require('../helpers/logger');
const { ValidationResult, Material, OperatingStation, Order, Shift, validateReportParameters,
    validatePaginationPage } = require("../models");
const { badRequestError, internalServerError } = require("./core");

async function getPaginatedReportList(req, res, next) {

    try {
        const report = validateReportParameters(req.body);
        if (!report.isValid) {
            return badRequestError(`The report schema is not valid`, res, report.errorList);
        }
        const offset = calculatePaginationOffset(req.params.page);
        const pasWhere = createPasPnQuery(req.body);

        var result = await ValidationResult.findAndCountAll({
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
                    }],
                }
            ],
            limit: 10,
            offset: offset,
            where: [
                sequelize.where(getDatePartConversion('ScanDate'), '>=', report.scanDate.from),
                sequelize.where(getDatePartConversion('ScanDate'), '<=', report.scanDate.to),
            ]
        });
        result.currentPage = parseInt(req.params.page);
        result.totalPages = Math.ceil(result.count / 10);
        logMessage("getPaginatedReportList consumed", result);

        return res.json(result);
    }
    catch(error) {
        logError("Error in getPaginatedReportList", error);
        return internalServerError(`Internal server error`, res);
    }
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

module.exports.getPaginatedReportList = getPaginatedReportList;
