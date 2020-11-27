'use strict';

const Joi = require("joi");
const { Op } = require("sequelize");
const { sequelize } = require("../helpers/sequelize");

const { ValidationResult, Customer, Material, OperatingStation, ReportParameterSchema, PageParameterSchema } = require("../models");
const { badRequestError } = require("./core");

async function getPaginatedReportList(req, res, next) {

    try {
        const {error} = ReportParameterSchema.validate(req.body);

        if (error) {
            const errorList = error.details.map(e => e.message);
            return badRequestError(`The schema is not valid`, res, errorList);
        }
        const offset = calculatePaginationOffset(req.params.page);
        const dateWhere = createDateWhereQuery(req.body);

        const result = await ValidationResult.findAndCountAll({
            include: [
                { model: Customer },
                { model: Material },
                { model: OperatingStation }
            ],
            limit: 10,
            offset: offset,
            where: dateWhere
        });
        return res.send(JSON.stringify(result, null, 2));
    }
    catch(error) {
        next(error);
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

function createPasPanQuery(payload) {

    var where = { };
    if (payload.hasOwnProperty('orderIdentifier')) {
        where.orderIdentifier = payload.orderIdentifier;
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
