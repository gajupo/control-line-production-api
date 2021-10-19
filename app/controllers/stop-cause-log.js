const Hoek = require('@hapi/hoek');

const { sequelize } = require('../helpers/sequelize');
const { logError, logMessage, logger } = require('../helpers/logger');
const {
  StopCauseLog, Order, OperatingStation, Shift, StopCause, ProductionLine, Material,
  Customer, validateModelId,
} = require('../models');
const {
  notFoundError, successfulOperation, internalServerError,
  badRequestError,
} = require('./core');

async function updateStoppedLine(stopCauseLogId) {
  try {
    const actualizados = await StopCauseLog.update({
      status: false,
      // TODO: Find a better way to do this.
      solutionDate: sequelize.literal('CURRENT_TIMESTAMP'),
    }, {
      where: { id: stopCauseLogId },
    });
    logger.info(`Paro de estacion liberado id ${stopCauseLogId}`);
    return actualizados;
  } catch (error) {
    logError('Error in unblockLine', error);
    return internalServerError('Internal server error');
  }
}
// eslint-disable-next-line no-unused-vars
async function getActiveStopCauseLogs(res, next) {
  try {
    const stopCauseLogs = await StopCauseLog.findAll({
      where: { status: true },
      attributes: ['id', 'status', 'createdDate'],
      include: [{
        model: Order,
        required: true,
        attributes: ['orderIdentifier', 'pasPN'],
        include: [{
          model: Shift,
          attributes: ['shiftDescription'],
        }, {
          model: Material,
          include: [{
            model: Customer,
            attributes: ['customerName'],
          }],
          attributes: ['id'],
        }],
      }, {
        model: StopCause,
        attributes: ['description'],
      }, {
        model: OperatingStation,
        attributes: ['id', 'stationIdentifier'],
        include: [{
          model: ProductionLine,
          attributes: ['lineName'],
        }],
      }],
    });
    const payload = stopCauseLogs.map((p) => p.dataValues);

    logMessage('getActiveStopCauseLogs consumed', payload);
    return res.json(stopCauseLogs);
  } catch (error) {
    logError('Error in getActiveStopCauseLogs', error);
    return internalServerError('Internal server error');
  }
}

async function getActiveStopCauseLogsByCustomer(req, res) {
  const customer = validateModelId(req.params.customerId);
  if (!customer.isValid) {
    return badRequestError(`getActiveStopCauseLogsByCustomer: Invalid customer ID: ${customer.id}`,
      res, customer.errorList);
  }
  try {
    const stopCauseLogs = await StopCauseLog.findAll({
      where: { status: true },
      attributes: ['id', 'status', 'createdDate', 'Barcode'],
      include: [{
        model: StopCause,
        attributes: ['description'],
        required: true,
      },
      {
        model: OperatingStation,
        attributes: ['id', 'stationIdentifier'],
        required: true,
        include: [{
          model: ProductionLine,
          attributes: ['lineName'],
          required: true,
          include: [{
            model: Customer,
            attributes: ['id', 'customerName', 'customerNumber'],
            required: true,
            where: { id: customer.id },
          }],
        }],
      },
      {
        model: Order,
        required: false,
        attributes: ['orderIdentifier', 'pasPN'],
        include: [{
          model: Shift,
          attributes: ['shiftDescription'],
        }],
      }],
    });
    const payload = stopCauseLogs.map((p) => p.dataValues);

    logMessage('getActiveStopCauseLogsByCustomer consumed', payload);
    return res.json(stopCauseLogs);
  } catch (error) {
    logError('Error in getActiveStopCauseLogsByCustomer', error);
    return internalServerError('Internal server error');
  }
}

// eslint-disable-next-line no-unused-vars
async function getStopCauseLogsRecord(res, next) {
  try {
    const recordCauseLog = await StopCauseLog.findAll({
      where: { status: false },
      limit: 10,
      attributes: ['id', 'createdDate'],
      include: [{
        model: Order,
        required: true,
        attributes: ['orderIdentifier', 'pasPN'],
        include: [{
          model: Shift,
          attributes: ['shiftDescription'],
        }],
      }, {
        model: StopCause,
        attributes: ['description'],
      }],
      order: [['createdDate', 'DESC']],
    });
    const payload = recordCauseLog.map((p) => p.dataValues);

    logMessage('getStopCauseLogsRecord consumed', payload);
    return res.json(recordCauseLog);
  } catch (error) {
    logError('Error in getStopCauseLogsRecord', error);
    return internalServerError('Internal server error');
  }
}

async function getStopCauseLogsRecordByCustomer(req, res) {
  const customer = validateModelId(req.params.customerId);
  if (!customer.isValid) {
    req.params.customerId = 1;
  }
  try {
    const recordCauseLog = await StopCauseLog.findAll({
      where: { status: false },
      limit: 10,
      attributes: ['id', 'createdDate', 'Barcode'],
      include: [{
        model: StopCause,
        attributes: ['description'],
        required: true,
      },
      {
        model: OperatingStation,
        attributes: ['id', 'stationIdentifier'],
        required: true,
        include: [{
          model: ProductionLine,
          attributes: ['lineName'],
          required: true,
          include: [{
            model: Customer,
            attributes: ['customerName'],
            required: true,
            where: { id: customer.id },
          }],
        }],
      },
      {
        model: Order,
        required: false,
        attributes: ['orderIdentifier', 'pasPN'],
        include: [{
          model: Shift,
          attributes: ['shiftDescription'],
        }],
      }],
      order: [['createdDate', 'DESC']],
    });
    const payload = recordCauseLog.map((p) => p.dataValues);

    logMessage('getStopCauseLogsRecordByCustomer consumed', payload);
    return res.json(recordCauseLog);
  } catch (error) {
    logError('Error in getStopCauseLogsRecordByCustomer', error);
    return internalServerError('Internal server error');
  }
}

async function unblockLine(req, res, io) {
  try {
    const stationIdentifier = Hoek.escapeHtml(req.params.stationIdentifier);
    const stoppedLine = await StopCauseLog.findOne({
      include: [{
        model: OperatingStation,
        where: { stationIdentifier: stationIdentifier },
      }, {
        model: Order,
        attributes: ['id'],
      }],
      where: { status: true },
    });
    logger.debug(`Linea detenida ${stoppedLine}`);
    if (stoppedLine) {
      const actualizados = await updateStoppedLine(stoppedLine.id);
      if (actualizados) {
        logMessage('unblockLine consumed', stoppedLine.dataValues);
        io.emit('line-unblocked', { id: stoppedLine.Order.id });

        successfulOperation(`The operating station ${stationIdentifier} was unblocked succesfully`, res);
      } else {
        internalServerError(`There was an error unblocking the operating station ${stationIdentifier}`, res);
      }
    }
    return notFoundError(`A blocked operating station with the identifier ${stationIdentifier} was not found`, res);
  } catch (error) {
    logError('Error in unblockLine', error);
    return internalServerError('Internal server error');
  }
}

module.exports.getActiveStopCauseLogs = getActiveStopCauseLogs;
module.exports.getActiveStopCauseLogsByCustomer = getActiveStopCauseLogsByCustomer;
module.exports.getStopCauseLogsRecord = getStopCauseLogsRecord;
module.exports.getStopCauseLogsRecordByCustomer = getStopCauseLogsRecordByCustomer;
module.exports.unblockLine = unblockLine;
