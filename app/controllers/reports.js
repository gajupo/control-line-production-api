'use strict';

const { Op } = require("sequelize");

const { sequelize } = require("../helpers/sequelize");
const { logError, logMessage } = require('../helpers/logger');
const { ValidationResult, Material, OperatingStation, Order, Shift, ReportParameterSchema, PageParameterSchema } = require("../models");
const { badRequestError, internalServerError } = require("./core");

async function getPaginatedReportList(req, res, next) {

    try {
        const {error} = ReportParameterSchema.validate(req.body);

        if (error) {
            const errorList = error.details.map(e => e.message);
            return badRequestError(`The schema is not valid`, res, errorList);
        }
        const offset = calculatePaginationOffset(req.params.page);
        const dateWhere = createDateWhereQuery(req.body);
        const pasWhere = createPasPnQuery(req.body);

        const result = await ValidationResult.findAndCountAll({
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
            where: dateWhere
        });
        result.currentPage = req.params.page;
        result.totalPages = result.count / 10;
        logMessage("getPaginatedReportList consumed", result);
        return res.send(JSON.stringify(result, null, 2));
    }
    catch(error) {
        logError("Error in getPaginatedReportList", error);
        return internalServerError(`Internal server error`, res);
    }
}

function createDateWhereQuery(payload) {

    var where = { };
    if (payload.hasOwnProperty('scanDate')) {
        const convertFunction = sequelize.fn('CONVERT', sequelize.literal('date'), sequelize.col('ScanDate'));
        where[Op.and] = [
            sequelize.where(convertFunction, '>=', payload.scanDate.from),
            sequelize.where(convertFunction, '<=', payload.scanDate.to),
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

    const {error} = PageParameterSchema.validate({ page: page });
    if (error) {
        return 0;
    }
    return (page * LIMIT) - LIMIT;
}

const LIMIT = 10;

module.exports.getPaginatedReportList = getPaginatedReportList;
