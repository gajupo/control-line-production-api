const { Op } = require('sequelize');
const { returnError } = require('./core');
const { sequelize } = require('../helpers/sequelize');
const { logError, logMessage } = require('../helpers/logger');
const { UserType, UserSectionPermissions } = require('../models');

async function getUserTypesList(parameters, res) {
  try {
    const usertypes = await UserType.findAll({
      raw: true,
      nest: true,
      attributes: ['id', 'name', 'description', 'status'],
    });
    logMessage(`UserTypes Controller getUserTypesList consumed by ${JSON.stringify(parameters)}`);
    return res.json(usertypes);
  } catch (error) {
    logError('Error in Controller UserTypes getUserTypesList details ', error, parameters);
    logError('Error in Controller UserTypes getUserTypesList compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
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
    logMessage(`UserTypes Controller setBulkUpdate consumed by ${JSON.stringify(parameters)}`);
    return res.json(result);
  } catch (error) {
    logError('Error in Controller UserTypes setBulkUpdate details ', error, parameters);
    logError('Error in Controller UserTypes setBulkUpdate compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}

async function setRolUpdateStatus(parameters, res) {
  try {
    const usertype = await UserType.update({
      status: parameters.usertype.status,
    }, {
      where: { id: parameters.usertype.id },
      returning: true,
      plain: true,
    });
    logMessage(`UserTypes Controller setRolUpdateStatus consumed by ${JSON.stringify(parameters)}`);
    return res.json(usertype);
  } catch (error) {
    logError('Error in Controller UserTypes setRolUpdateStatus details ', error, parameters);
    logError('Error in Controller UserTypes setRolUpdateStatus compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}
async function setRolUpdateGeneral(parameters, res) {
  try {
    const usertype = await UserType.update({
      status: parameters.usertype.status,
      name: parameters.usertype.name,
      description: parameters.usertype.description,
    }, {
      where: { id: parameters.usertype.id },
      returning: true,
      plain: true,
    });
    logMessage(`UserTypes Controller setRolUpdateGeneral consumed by ${JSON.stringify(parameters)}`);
    return res.json(usertype);
  } catch (error) {
    logError('Error in Controller UserTypes setRolUpdateGeneral details ', error, parameters);
    logError('Error in Controller UserTypes setRolUpdateGeneral compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}
async function setSectionPermissionsbyUserType(parameters, res) {
  const t = await sequelize.transaction();
  try {
    const Promises = [];
    if (parameters.sectionpermissionsDelete.length > 0) {
      for (let i = 0; i < parameters.sectionpermissionsDelete.length; i++) {
        const promiseDelete = UserSectionPermissions.destroy({
          where: {
            [Op.and]: [
              { applicationSectionId: parameters.sectionpermissionsDelete[i] },
              { userTypeId: parameters.usertype.id },
            ],
          },
          transaction: t,
        });
        Promises.push(promiseDelete);
      }
    }
    if (parameters.sectionpermissionsAdd.length > 0) {
      for (let i = 0; i < parameters.sectionpermissionsAdd.length; i++) {
        const promiseAdd = UserSectionPermissions.findOrCreate({
          where: {
            applicationSectionId: parameters.sectionpermissionsAdd[i],
            userTypeId: parameters.usertype.id,
            active: true,
          },
          defaults: {
            applicationSectionId: parameters.sectionpermissionsAdd[i],
            userTypeId: parameters.usertype.id,
            active: true,
          },
          transaction: t,
        });
        Promises.push(promiseAdd);
      }
    }
    Promise.all(Promises).then(async (result) => {
      await t.commit();
      logMessage(`setSectionPermissionsbyUserType ${JSON.stringify(result)}`);
    });
    logMessage(`UserTypes Controller setSectionPermissionsbyUserType consumed by ${JSON.stringify(parameters)}`);
    return res.json(true);
  } catch (error) {
    t.rollback();
    logError('Error in Controller UserTypes setSectionPermissionsbyUserType details ', error, parameters);
    logError('Error in Controller UserTypes setSectionPermissionsbyUserType compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}

module.exports.getUserTypesList = getUserTypesList;
module.exports.setBulkUpdate = setBulkUpdate;
module.exports.setRolUpdateStatus = setRolUpdateStatus;
module.exports.setRolUpdateGeneral = setRolUpdateGeneral;
module.exports.setSectionPermissionsbyUserType = setSectionPermissionsbyUserType;
