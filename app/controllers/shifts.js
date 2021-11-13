const { logError } = require('../helpers/logger');
const { Shift, ProductionLine, validateModelId } = require('../models');
const { internalServerError, badRequestError } = require('./core');
const serviceShift = require('../services/shift');

async function getShiftsPerProductionLineImpl(productionLineId) {
  const shifts = await Shift.findAll({
    include: {
      model: ProductionLine,
      through: {
        where: { productionLineId: productionLineId },
      },
      required: true,
      attributes: [],
    },
  });
  return shifts;
}
/**
 * Returns the shifts corresponding to the production line with the ID
 * given as a parameter.
 */
async function getShiftsPerProductionLine(req, res) {
  try {
    const line = validateModelId(req.params.productionLineId);

    if (!line.isValid) {
      return badRequestError(`The production line ID ${line.id} is not valid`, res, line.errorList);
    }
    const shifts = await getShiftsPerProductionLineImpl(line.id);
    return res.json(shifts);
  } catch (error) {
    logError('Error in getShiftsPerProductionLine', error);
    return internalServerError('Internal server error', res);
  }
}

async function getCurrentShiftProductionLine(req, res){
  try{
    const line = validateModelId(req.params.productionLineId);
    const customerId = validateModelId(req.params.customerId); 
    if(!line.isValid){
      return badRequestError(`The production line ID ${line.id} is not valid`, res, line.errorList);
    }
    const shift = await serviceShift.getCurrentShift(line.id,customerId.id);
    return res.json(shift);
  }catch(error){
      logError('Error in getCurrentShift', error);
      return internalServerError('Internal server error', res);
    
  }
}

module.exports.getShiftsPerProductionLine = getShiftsPerProductionLine;
module.exports.getShiftsPerProductionLineImpl = getShiftsPerProductionLineImpl;
module.exports.getCurrentShiftProductionLine = getCurrentShiftProductionLine;