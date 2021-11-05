const fsp = require('fs').promises;
const { logError } = require('../helpers/logger');
const { Customer } = require('../models');
const { internalServerError } = require('./core');

// eslint-disable-next-line no-unused-vars
async function getCustomerList(res, next) {
  try {
    const customers = await Customer.findAll({
      attributes: ['id', 'customerNumber', 'customerName'],
    });
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
