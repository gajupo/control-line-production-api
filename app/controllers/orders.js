const { format } = require('date-fns');
const { Sequelize } = require('sequelize');
const { logError } = require('../helpers/logger');
const services = require('../services');
const {
  internalServerError,
  notFoundError,
  successfulOperation,
  badRequestError,
} = require('./core');
const {
  Order, Material, Customer, ProductionLine, Shift, validateModelId,
  validateOrderParameters, StopCauseLog,
} = require('../models');
const { getMaterial } = require('./materials');

// eslint-disable-next-line no-unused-vars
async function getCurrentOrders(res, next) {
  try {
    const orders = await Order.findAll({
      attributes: ['id', 'orderIdentifier', 'materialScanned', 'isIncomplete'],
      include: [{
        model: Material,
        attributes: ['id', 'pasPN', 'productionRate'],
        include: [{
          model: Customer,
          attributes: ['id', 'customerName'],
        }],
      }, {
        model: ProductionLine,
        attributes: ['id', 'lineName'],
      }, {
        model: Shift,
        attributes: ['id', 'shiftDescription'],
      }],
    });
    return res.json(orders);
  } catch (error) {
    logError('Error in getCurrentOrders', error);
    return internalServerError('Internal server error', res);
  }
}

async function getCustomerOrders(req, res) {
  try {
    const customer = validateModelId(req.params.id);
    if (!customer.isValid) {
      return badRequestError(`Invalid customer ID: ${customer.id}`, res, customer.errorList);
    }
    const orders = await Order.findAll({
      attributes: ['id', 'orderIdentifier', 'materialScanned', 'isIncomplete'],
      include: [{
        model: Material,
        attributes: ['id', 'pasPN', 'productionRate'],
        required: true,
        include: [{
          model: Customer,
          attributes: ['id', 'customerName'],
          where: { id: customer.id },
        }],
      }, {
        model: ProductionLine,
        attributes: ['id', 'lineName'],
      }, {
        model: Shift,
        attributes: ['id', 'shiftDescription'],
      }, {
        model: StopCauseLog,
        required: false,
        attributes: ['id', 'status'],
        where: { status: true },
      }],
      where: { isIncomplete: true },
    });
    return res.json(orders);
  } catch (error) {
    logError('Error in getCustomerOrders', error);
    return internalServerError('Internal server error', res);
  }
}
function generateOrderIdentifier(dateTime, productionLine) {
  return `${format(dateTime, 'ddMMyyHHmmss')}${productionLine.OperatingStation.stationIdentifier}-${productionLine.OperatingStation.id}`;
}
async function createNewOrder(req, res) {
  try {
    const params = validateOrderParameters(req.body);
    if (!params.isValid) {
      return badRequestError('The schema is not valid', res, params.errorList);
    }
    const lineId = req.body.productionLineId;
    const { materialId } = req.body;
    const { shiftId } = req.body;
    const now = new Date();

    const productionLine = await services.ProductionLines.getProductionLineById(lineId);
    if (productionLine == null) {
      return notFoundError(`A order with the id ${lineId} was not found`);
    }
    const material = await getMaterial(materialId);
    if (material == null) {
      return notFoundError(`A material with the id ${materialId} was not found`, res);
    }
    const orderIdentifier = generateOrderIdentifier(now, productionLine);

    const order = await Order.create({
      orderIdentifier: orderIdentifier,
      pasPN: material.pasPN,
      materialScanned: 0,
      createdAt: now,
      active: true,
      isIncomplete: true,
      stationIdentifier: productionLine.OperatingStation.stationIdentifier,
      ShiftId: shiftId,
      ProductionLineId: lineId,
      MaterialId: materialId,
    });
    if (order) {
      // TODO: Optimizar enviando todos los datos requeridos
      const fullOrder = await order.reload({
        include: [{
          model: Material,
          attributes: ['id', 'pasPN'],
          required: true,
          include: [{
            model: Customer,
            attributes: ['id', 'customerName'],
          }],
        }, {
          model: ProductionLine,
          attributes: ['id', 'lineName'],
        }, {
          model: Shift,
          attributes: ['id', 'shiftDescription'],
        }, {
          model: StopCauseLog,
          required: false,
          attributes: ['id', 'status'],
          where: { status: true },
        }],
      });
      // TODO: ENABLE IT WHEN SOCKE IO IS IMPLEMENTED
      // io.emit('order-created', fullOrder);
      return successfulOperation(`The order with the identifier ${orderIdentifier} was created succesfully.`, res, 'order', order);
    }
    return internalServerError('There was an error saving the new Order', res);
  } catch (error) {
    logError('Error in createNewOrder', error);
    return internalServerError('Internal server error', res);
  }
}
async function scanOrderProduct(req, res) {
  try {
    const order = validateModelId(req.params.orderId);
    if (!order.isValid) {
      return badRequestError(`Invalid customer ID: ${order.id}`, res, order.errorList);
    }
    const updated = await Order.update({ materialScanned: Sequelize.literal('MaterialScanned + 1') }, {
      where: { id: order.id },
    });
    if (updated[0] > 0) {
      // ENABLE IT WHEN SOCKER IO IS IMPLEMENTED
      // io.emit('order-scanned', { orderId: order.id });
      return res.json({ orderId: order.id });
    }
    return res.json({ orderId: 0 });
  } catch (error) {
    logError('Error in scanOrderProduct', error);
    return internalServerError('Internal server error', res);
  }
}

async function closeOrder(req, res) {
  try {
    const model = validateModelId(req.params.orderId);
    if (!model.isValid) {
      return badRequestError(`Invalid order ID: ${model.id}`, res, model.errorList);
    }
    const order = await Order.findOne({
      attributes: ['id', 'isIncomplete'],
      where: {
        id: model.id,
        isIncomplete: true,
      },
    });
    if (order) {
      order.isIncomplete = false;
      order.save();
      // TODO: ENABLE IT WHEM SOCKET IO IS IMPLEMENTED
      // io.emit('order-complete', order);
      return res.json(order);
    }
    return res.json({ message: `The order with the ID ${model.id} was not found` });
  } catch (error) {
    logError('Error in closeOrder', error);
    return internalServerError('Internal server error', res);
  }
}

module.exports.getCurrentOrders = getCurrentOrders;
module.exports.createNewOrder = createNewOrder;
module.exports.getCustomerOrders = getCustomerOrders;
module.exports.scanOrderProduct = scanOrderProduct;
module.exports.closeOrder = closeOrder;
