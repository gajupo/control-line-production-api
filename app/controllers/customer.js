const fsp = require('fs').promises;
const { logError, logger } = require('../helpers/logger');
const { Customer, UserCustomer, ProductionLine } = require('../models');
const { internalServerError } = require('./core');

// eslint-disable-next-line no-unused-vars
async function getCustomerList(req, res, next) {
  try {
    let customers;
    //If rol it's administrator return all customers and lines
    if (req.user.rolId == 1) {
       customers = await Customer.findAll({
        attributes: [['Id', 'id'], ['CustomerName', 'customerName']],
        include: [{
          as: 'lineas',
          model: ProductionLine,
          attributes: ['id', ['lineName', 'LineName']],
        }]
      });
    //if rol it's supervisor return only customers and lines, associates in UserCustomers  
    }else if(req.user.rolId == 2){
      customers = await Customer.findAll({
        attributes: [['Id', 'id'], ['CustomerName', 'customerName']],
        include: [{
          model: UserCustomer,
          attributes: [],
          where: { userId: req.user.userId },
        }, {
          as: 'lineas',
          model: ProductionLine,
          attributes: ['id', ['lineName', 'LineName']],
        }]
      });
    }else{
      logger.debug('Rol id not valid for resquested this end point');
      throw new Error("Rol id not valid for resquested this end point");
    }
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
