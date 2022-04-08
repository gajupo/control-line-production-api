const fsp = require('fs').promises;
const { logError, logger } = require('../helpers/logger');
const {
  Customer, UserCustomer, ProductionLine, validateCustomerListParams,
} = require('../models');
const { internalServerError, badRequestError } = require('./core');

async function getCustomerList(res) {
  try {
    // If rol it's administrator return all customers and lines
    const customers = await Customer.findAll({
      attributes: [['Id', 'id'], ['CustomerName', 'customerName']],
      include: [{
        as: 'lineas',
        model: ProductionLine,
        attributes: ['id', ['lineName', 'LineName']],
      }],
    });
    logger.debug('CustomerList found ', customers);
    return res.json(customers);
  } catch (error) {
    logError('Error in getCustomerList', error);
    return internalServerError('Internal server error', res);
  }
}

async function getCustomerListByUserId(parameters, res) {
  try {
    logger.debug('params sent on getCustomerListByUserId', parameters);
    const parametersValidated = validateCustomerListParams(parameters);
    if (!parametersValidated.isValid) {
      return badRequestError('Invalid parameters passed to getCustomerListByUserId', res, parametersValidated.errorList);
    }
    // if rol it's supervisor return only customers and lines, associates in UserCustomers
    const customersList = await UserCustomer.findAll({
      attributes: [],
      where: { userId: parameters.UserId },
      raw: true,
      nest: true,
      include: [{
        model: Customer,
        attributes: [['Id', 'id'], ['CustomerName', 'customerName']],
      }, {
        as: 'lineas',
        model: ProductionLine,
        attributes: ['id', ['lineName', 'LineName']],
      }],
    }).then((customers) => {
      if (customers) {
        // I use the reduce method to create the resulting array
        const customersFormatt = customers.reduce((prev, current) => {
          const { Customer: { id, customerName }, lineas } = current;
          // I check if the customerId already exists
          let exists = prev.find((x) => x.id === id);
          // If it doesn't exist I create it with an empty array in lines
          if (!exists) {
            exists = { id: id, customerName: customerName, lineas: [] };
            prev.push(exists);
          }
          // If the current element has lines I add it to the array of the
          // existing element
          if (lineas != null) {
            if (exists.lineas.indexOf(lineas) < 0) {
              exists.lineas.push(lineas);
            }
          }
          // I return the result array for the new iteration
          return prev;
        }, []);
        return customersFormatt;
      }
      throw new Error('Error in getCustomerListByUserId for the user.');
    });
    logger.debug('CustomerList found ', customersList);
    return res.json(customersList);
  } catch (error) {
    logError('Error in getCustomerListByUserId', error);
    return internalServerError('Internal server error', res);
  }
}

function getCustomerLogoAsBase64(customerId) {
  return fsp.readFile(`app/assets/logos/customer-${customerId}.png`, 'base64');
}

module.exports.getCustomerList = getCustomerList;
module.exports.getCustomerListByUserId = getCustomerListByUserId;
module.exports.getCustomerLogoAsBase64 = getCustomerLogoAsBase64;
