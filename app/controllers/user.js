const { Op } = require('sequelize');
const { logError, logger } = require('../helpers/logger');
const { UserSectionPermissions, ApplicationSections, User } = require('../models');
const { internalServerError } = require('./core');
// const { Role } = require('../helpers/role');
// const { getKeyByValue, getStringByStatus } = require('../helpers/lib');

async function getSectionPermissionsList(parameters, res) {
  try {
    const sectionpermissions = await ApplicationSections.findAll({
      raw: true,
      nest: true,
      attributes: ['sectionName'],
      include: {
        model: UserSectionPermissions,
        attributes: [],
        where: {
          userTypeId: parameters.RolId,
          active: true,
        },
      },
    }).then((sections) => {
      if (sections) {
        return sections.map((section) => section.sectionName);
      }
      throw new Error('Error in get section permissions for the user.');
    });
    logger.debug('User sectionpermissions found ', sectionpermissions);
    return res.json(sectionpermissions);
  } catch (error) {
    logError('Error in getSectionPermissionsList', error);
    return internalServerError('Internal server error', res);
  }
}
async function getUsersList(parameters, res) {
  try {
    const users = await User.findAll({
      raw: true,
      nest: true,
      attributes: ['id', ['userName', 'username'], 'name', ['firstName', 'firstname'], ['emailAddress', 'email'], 'status', ['userTypeId', 'usertype'], 'lockcode'],
      where: { id: { [Op.ne]: parameters.UserId } },
    });/* .then((usersList) => {
      usersList.map((user) => {
        // eslint-disable-next-line no-param-reassign
        user.usertype = getKeyByValue(Role, user.usertype);
        return user;
      });
      return usersList;
    }); */
    logger.debug('getUsersList consumed by ', parameters);
    return res.json(users);
  } catch (error) {
    logError('Error in getUsersList', error);
    return internalServerError('Internal server error', res);
  }
}
async function getUser(parameters, res) {
  try {
    const userData = await User.findAll({
      raw: true,
      nest: true,
      attributes: ['id', ['userName', 'username'], 'name', ['firstName', 'firstname'], ['emailAddress', 'email'], 'status', ['userTypeId', 'usertype'], 'lockcode'],
      where: { id: { [Op.eq]: parameters.UserId } },
    });
    logger.debug('getUser consumed by ', parameters);
    return res.json(userData);
  } catch (error) {
    logger.debug('Error in getUser ', error);
    logError('Error in getUser', error);
    return internalServerError('Internal server error', res);
  }
}

async function setBulkUpdate(parameters, res) {
  try {
    const result = await User.update({
      status: parameters.status,
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
    logger.debug('Error in setBulkUpdate ', error);
    logError('Error in setBulkUpdate', error);
    return internalServerError('Internal server error', res);
  }
}

async function setProfileUpdateStatus(parameters, res) {
  try {
    const user = await User.update({
      status: parameters.user.status,
    }, {
      where: { id: parameters.user.id },
      returning: true,
      plain: true,
    });
    logger.debug('setProfileUpdateStatus consumed by ', parameters);
    return res.json(user);
  } catch (error) {
    logger.debug('Error in setProfileUpdateStatus ', error);
    logError('Error in setProfileUpdateStatus', error);
    return internalServerError('Internal server error', res);
  }
}
async function setProfileUpdateGeneral(parameters, res) {
  try {
    const user = await User.update({
      status: parameters.user.status,
      lockCode: parameters.user.lockcode,
      userTypeId: parameters.user.usertype,
    }, {
      where: { id: parameters.user.id },
      returning: true,
      plain: true,
    });
    logger.debug('setProfileUpdateStatus consumed by ', parameters);
    return res.json(user);
  } catch (error) {
    logger.debug('Error in setProfileUpdateStatus ', error);
    logError('Error in setProfileUpdateStatus', error);
    return internalServerError('Internal server error', res);
  }
}

module.exports.getSectionPermissionsList = getSectionPermissionsList;
module.exports.getUsersList = getUsersList;
module.exports.getUser = getUser;
module.exports.setBulkUpdate = setBulkUpdate;
module.exports.setProfileUpdateStatus = setProfileUpdateStatus;
module.exports.setProfileUpdateGeneral = setProfileUpdateGeneral;
