const { Op } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');
const { logError, logMessage } = require('../helpers/logger');
const {
  UserSectionPermissions, ApplicationSections, User, UserCustomer,
} = require('../models');
const { returnError, notFoundError } = require('./core');

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
      return notFoundError('Error al obtener permisos de sección para la usuario.', res);
    });
    logMessage('User Controller sectionpermissions consumed by ', parameters);
    return res.json(sectionpermissions);
  } catch (error) {
    logError('Error in Controller User getSectionPermissionsList details ', error, parameters);
    logError('Error in Controller User getSectionPermissionsList compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}
async function getUsersList(parameters, res) {
  try {
    const users = await User.findAll({
      raw: true,
      nest: true,
      attributes: ['id', ['userName', 'username'], 'name', ['firstName', 'firstname'], ['emailAddress', 'email'], 'status', ['userTypeId', 'usertype'], 'lockcode'],
      // where: { id: { [Op.ne]: parameters.UserId } },
    });
    logMessage('User Controller getUsersList consumed by ', parameters);
    return res.json(users);
  } catch (error) {
    logError('Error in Controller User getUsersList details ', error, parameters);
    logError('Error in Controller User getUsersList compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
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
    logMessage('User Controller getUser consumed by ', parameters);
    return res.json(userData);
  } catch (error) {
    logError('Error in Controller User getUser details ', error, parameters);
    logError('Error in Controller User getUser compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
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
    logMessage('User Controller setBulkUpdate consumed by ', parameters);
    return res.json(result);
  } catch (error) {
    logError('Error in Controller User setBulkUpdate details ', error, parameters);
    logError('Error in Controller User setBulkUpdate compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
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
    logMessage('User Controller setProfileUpdateStatus consumed by ', parameters);
    return res.json(user);
  } catch (error) {
    logError('Error in Controller User setProfileUpdateStatus details ', error, parameters);
    logError('Error in Controller User setProfileUpdateStatus compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
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
    logMessage('User Controller setProfileUpdateGeneral consumed by ', parameters);
    return res.json(user);
  } catch (error) {
    logError('Error in Controller User setProfileUpdateGeneral details ', error, parameters);
    logError('Error in Controller User setProfileUpdateGeneral compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}
async function setCustomersLinesbyUser(parameters, res) {
  const t = await sequelize.transaction();
  try {
    const Promises = [];
    if (parameters.customersDelete.length > 0) {
      for (let i = 0; i < parameters.customersDelete.length; i++) {
        const promiseDelete = UserCustomer.destroy({
          where: {
            [Op.and]: [
              { productionLineId: parameters.customersDelete[i] },
              { userId: parameters.user.id },
            ],
          },
          transaction: t,
        });
        Promises.push(promiseDelete);
      }
    }
    if (parameters.customersAdd.length > 0) {
      for (let i = 0; i < parameters.customersAdd.length; i++) {
        const promiseAdd = UserCustomer.findOrCreate({
          where: {
            productionLineId: parameters.customersAdd[i].id,
            userId: parameters.user.id,
          },
          defaults: {
            customerId: parameters.customersAdd[i].parent,
            productionLineId: parameters.customersAdd[i].id,
            userId: parameters.user.id,
          },
          transaction: t,
        });
        Promises.push(promiseAdd);
      }
    }
    Promise.all(Promises).then(async (result) => {
      await t.commit();
      logMessage('setCustomersLinesbyUser ', result);
    });
    logMessage('User Controller setCustomersLinesbyUser consumed by ', parameters);
    return res.json(true);
  } catch (error) {
    t.rollback();
    logError('Error in Controller User setCustomersLinesbyUser details ', error, parameters);
    logError('Error in Controller User setCustomersLinesbyUser compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}

module.exports.getSectionPermissionsList = getSectionPermissionsList;
module.exports.getUsersList = getUsersList;
module.exports.getUser = getUser;
module.exports.setBulkUpdate = setBulkUpdate;
module.exports.setProfileUpdateStatus = setProfileUpdateStatus;
module.exports.setProfileUpdateGeneral = setProfileUpdateGeneral;
module.exports.setCustomersLinesbyUser = setCustomersLinesbyUser;
