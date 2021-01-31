'use strict';

const { logError } = require('../helpers/logger');
const { Shift, PageParameterSchema } = require("../models");
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
            return badRequestError(`The production line ID ${req.params.id} is not valid`, res, errorList);
        }
        const shifts = await Shift.findAll({
            through: {
                where: { productionLineId: productionLine.id },
                attributes: []
            },
            attributes: ['id', 'shifDescription', 'shiftStart', 'shiftEnd']
        });
        res.send(JSON.stringify(shifts, null, 2));
    }
    catch (error) {
        logError("Error in getShiftsPerProductionLine", error);
        return internalServerError(`Internal server error`, res);
    }
}

module.exports.getShiftsPerProductionLine = getShiftsPerProductionLine;
