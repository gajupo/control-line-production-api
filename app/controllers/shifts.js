'use strict';

const { logError } = require('../helpers/logger');
const { Shift, ProductionLine, validateModelId } = require("../models");
const { internalServerError, badRequestError } = require("./core");

/**
 * Returns the shifts corresponding to the production line with the ID
 * given as a parameter.
 */
async function getShiftsPerProductionLine(req, res) {
    try {
        const productionLineId = req.params.productionLineId;
        const modelId = validateModelId(productionLineId);

        if (!modelId.isValid) {
            return badRequestError(`The production line ID ${productionLineId} is not valid`, res, modelId.errorList);
        }
        const shifts = await getShiftsPerProductionLineImpl(productionLineId);
        res.json(shifts);
    }
    catch (error) {
        logError("Error in getShiftsPerProductionLine", error);
        return internalServerError(`Internal server error`, res);
    }
}

async function getCurrentShift(dateTime, productionLine) {

    const fractionalHours = dateTime.getHours() + (dateTime.getMinutes() / 60);

    const shifts = await getShiftsPerProductionLineImpl(productionLine);
    const shift = shifts.find(s => fractionalHours >= s.shiftStart && fractionalHours <= s.shiftEnd);

    return shift;
}

async function getShiftsPerProductionLineImpl(productionLineId) {

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
    return shifts;
}

module.exports.getShiftsPerProductionLine = getShiftsPerProductionLine;
module.exports.getCurrentShift = getCurrentShift;
module.exports.getShiftsPerProductionLineImpl = getShiftsPerProductionLineImpl;
