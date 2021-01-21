'use strict';

const { logError } = require('../helpers/logger');
const { internalServerError } = require("./core");
const { ProductionLine, OperatingStation } = require('../models');

async function getProductionLines(res) {
    try {
        const productionlines = await ProductionLine.findAll({
            include: [{
                model: OperatingStation,
                attributes: ['id', 'stationIdentifier']
            }],
            attributes: ['id']
        });
        return productionlines;
    }
    catch (error) {
        logError("Error in getProductionLines", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getProductionLines = getProductionLines;
