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
      customers = await UserCustomer.findAll({
        attributes: [],
        where: { userId: req.user.userId },
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
      }).then(customers => {
        if (customers) {
          // I use the reduce method to create the resulting array
          let customersFormatt = customers.reduce((prev, current) => {
            let { Customer: { id, customerName }, lineas } = current;
            // I check if the customerId already exists
            let exists = prev.find(x => x.id === id);
            // If it doesn't exist I create it with an empty array in lines
            if (!exists) {
              exists = { id: id,customerName: customerName, lineas: [] };
              prev.push(exists);
            }
            // If the current element has lines I add it to the array of the
            // existing element
            if (lineas != null) {
              if(exists.lineas.indexOf(lineas) < 0){
                exists.lineas.push(lineas);
              }
            }
            // I return the result array for the new iteration
            return prev;
          }, []);
          return customersFormatt;
        } else {
          throw new Error("Error in get section permissions for the user.");
        }
      });
    }else{
      logger.debug('Rol id not valid for resquested this end point');
      throw new Error("Rol id not valid for resquested this end point");
    }
    logger.debug('CustomerList found ', customers);
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
