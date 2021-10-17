const { utcToZonedTime } = require('date-fns-tz');
const { Sequelize, Op } = require('sequelize');
const { logError } = require('../helpers/logger');
const { internalServerError } = require('./core');
const services = require('../services');
const { getDatePartConversion } = require('../helpers/sequelize');
const {
  Order, Material,
} = require('../models');

async function getValidationResultsPerHour(req, res) {
  try {
    const params = req.body;
    // eslint-disable-next-line max-len
    const productionPerHour = await services.ValidationResults.getValidationResultsPerHourImpl(params);
    const joined = services.ValidationResults.joinValidationsAndProductionRate(
      productionPerHour,
      params.shiftStart, params.shiftEnd,
    );
    return res.json(joined);
  } catch (error) {
    logError('Error in getValidationResultsPerHour', error);
    return internalServerError('Internal server error', res);
  }
}
// eslint-disable-next-line no-unused-vars
async function getProductionRatePerHourImpl(params) {
  const today = utcToZonedTime(params.date, 'America/Mexico_City');
  const productionRates = await Order.findAll({
    attributes: [
      [Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')), 'hour'],
      [Sequelize.fn('SUM', Sequelize.col('Material.ProductionRate')), 'productionRatesSum'],
    ],
    include: [{
      model: Material,
      required: true,
      attributes: [],
    }],
    where: {
      [Op.and]: [
        Sequelize.where(Sequelize.col('Order.ShiftId'), '=', params.shiftId),
        Sequelize.where(Sequelize.col('Order.ProductionLineId'), '=', params.productionLineId),
        Sequelize.where(getDatePartConversion('Order.CreatedAt'), '=', today),
      ],
    },
    group: [
      Sequelize.fn('DATEPART', Sequelize.literal('HOUR'), Sequelize.col('Order.CreatedAt')),
      'Material.ID',
      'Material.ProductionRate',
    ],
    raw: true,
  });
  return productionRates;
}

module.exports.getValidationResultsPerHour = getValidationResultsPerHour;
