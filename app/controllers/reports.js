'use strict';

const { Order, Material, OperatingStation, Shift } = require("../models");

async function getPaginatedReportList(page, req, res, next) {

    try {
        res.send('getPaginatedReportList called');
    }
    catch(error) {
        next(error);
    }
}
