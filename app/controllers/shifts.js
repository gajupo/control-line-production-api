'use strict';

const { logError } = require('../helpers/logger');
const { Shift, PageParameterSchema, ProductionLine } = require("../models");
const { internalServerError, badRequestError } = require("./core");

/**
 * Returns the shifts corresponding to the production line with the ID
 * given as a parameter.
 */
async function getShiftsPerProductionLine(req, res) {
    try {
        const {error} = PageParameterSchema.validate({ page: req.params.productionLineId });
        if (error) {
            const errorList = error.details.map(e => e.message);
            return badRequestError(`The production line ID ${req.params.productionLineId} is not valid`, res, errorList);
        }
        const productionLineId = req.params.productionLineId;
        const shifts = await Shift.findAll({
            include: {
                model: ProductionLine,
                through: {
                    where: { productionLineId: productionLineId },
                },
                required: true,
                attributes: []
            },
            attributes: ['id', 'shiftDescription', 'shiftStart', 'shiftEnd']
        });
        res.send(JSON.stringify(shifts, null, 2));
    }
    catch (error) {
        logError("Error in getShiftsPerProductionLine", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getShiftsPerProductionLine = getShiftsPerProductionLine;
