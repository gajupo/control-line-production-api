'use strict';

const { Order, Material, OperatingStation, Shift, ReportParameterSchema } = require("../models");
const { badRequestError } = require("./core");

async function getPaginatedReportList(page, req, res, next) {

    try {
        const {error} = ReportParameterSchema.validate(req.body);

        if (error) {
            const errorList = error.details.map(e => e.message);
            return badRequestError(`The schema is not valid`, res, errorList);
        }
        res.send(JSON.stringify(req.body, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getPaginatedReportList = getPaginatedReportList;
