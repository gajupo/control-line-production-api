const { Op } = require('sequelize');
const { logError, logger } = require('../helpers/logger');
const { UserType } = require('../models');
const { internalServerError } = require('./core');

async function getUserTypesList(parameters, res) {
  try {
    const usertypes = await UserType.findAll({
      raw: true,
      nest: true,
      attributes: ['id', 'name', 'description', 'status'],
    });
    logger.debug('getUserTypesList consumed by ', parameters);
    return res.json(usertypes);
  } catch (error) {
    logError('Error in getUserTypesList', error);
    return internalServerError('Internal server error', res);
  }
}

async function setBulkUpdate(parameters, res) {
  try {
    const result = await UserType.update({
      status: parameters.type,
    }, {
      where: {
        id: {
          [Op.in]: parameters.users.map((item) => item),
        },
      },
    });
    logger.debug('setBulkUpdate consumed by ', parameters);
    return res.json(result);
  } catch (error) {
    logError('Error in setBulkUpdate', error);
    return internalServerError('Internal server error', res);
  }
}

module.exports.getUserTypesList = getUserTypesList;
module.exports.setBulkUpdate = setBulkUpdate;
