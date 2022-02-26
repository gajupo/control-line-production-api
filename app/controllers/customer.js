const fsp = require('fs').promises;
const { logError, logger } = require('../helpers/logger');
const { Customer, UserCustomer, ProductionLine } = require('../models');
const { internalServerError } = require('./core');

// eslint-disable-next-line no-unused-vars
async function getCustomerList(req, res, next) {
  try {
    const customers = await Customer.findAll({
      attributes: [['Id','id'],['CustomerName', 'customerName']],
      include:[{
        model: UserCustomer,
        attributes:[],
        where: { userId: req.user.userId },
      },{
        as: 'lineas',
        model: ProductionLine,
        attributes: ['id', ['lineName', 'LineName']],
      }]
    });
    /*const customers = await Customer.findAll({
      attributes: ['id', 'customerNumber', 'customerName'],
    });*/
    logger.debug('Customer found ', customers);
    return res.json(customers);
  } catch (error) {
    logError('Error in getCustomerList', error);
    return internalServerError('Internal server error', res);
  }
}

function getCustomerLogoAsBase64(customerId) {
  return fsp.readFile(`app/assets/logos/customer-${customerId}.png`, 'base64');
}

module.exports.getCustomerList = getCustomerList;
module.exports.getCustomerLogoAsBase64 = getCustomerLogoAsBase64;
