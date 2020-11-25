'use strict';

const { Order, Material, OperatingStation, Shift, ReportParameterSchema } = require("../models");

async function getPaginatedReportList(page, req, res, next) {

    try {
        const {error, value} = ReportParameterSchema.validate(req.body);
        res.send(JSON.stringify(req.body, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getPaginatedReportList = getPaginatedReportList;
