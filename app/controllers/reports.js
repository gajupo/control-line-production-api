'use strict';

const { Order, Material, OperatingStation, Shift } = require("../models");

async function getPaginatedReportList(page, req, res, next) {

    try {

        res.send(JSON.stringify(req.body, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getPaginatedReportList = getPaginatedReportList;
