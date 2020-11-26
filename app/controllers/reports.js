'use strict';

const { Op } = require("sequelize");
const { sequelize } = require("../helpers/sequelize");

const { ValidationResult, Customer, Material, OperatingStation, ReportParameterSchema } = require("../models");
const { badRequestError } = require("./core");

async function getPaginatedReportList(page, req, res, next) {

    try {
        const {error} = ReportParameterSchema.validate(req.body);

        if (error) {
            const errorList = error.details.map(e => e.message);
            return badRequestError(`The schema is not valid`, res, errorList);
        }
        const where = createWhereQuery(req.body);

        const result = await ValidationResult.findAndCountAll({
            include: [
                { model: Customer },
                { model: Material },
                { model: OperatingStation }
            ],
            limit: 10,
            where: where
        });
        return res.send(JSON.stringify(result, null, 2));
    }
    catch(error) {
        next(error);
    }
}

function createWhereQuery(payload) {

    var where = { };
    if (payload.hasOwnProperty('orderIdentifier')) {
        where.orderIdentifier = payload.pasPN;
    }
    if (payload.hasOwnProperty('scanDate')) {
        where[Op.and] = [
            sequelize.where(sequelize.fn('CONVERT', sequelize.literal('date'), sequelize.col('ScanDate')), '>=', payload.scanDate.from),
            sequelize.where(sequelize.fn('CONVERT', sequelize.literal('date'), sequelize.col('ScanDate')), '<=', payload.scanDate.to),
        ]
    }
    return where;
}

module.exports.getPaginatedReportList = getPaginatedReportList;
