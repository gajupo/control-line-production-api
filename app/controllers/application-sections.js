const { Op } = require('sequelize');
const { ApplicationSections, UserSectionPermissions } = require('../models');
const { returnError } = require('./core');
const { logError, logMessage } = require('../helpers/logger');

async function getApplicationSectionsList(parameters, res) {
  try {
    const applicationsections = await ApplicationSections.findAll({
      raw: true,
      nest: true,
      attributes: ['id', 'sectionName', 'sectionTypeId'],
    });
    logMessage('ApplicationSections Controller getApplicationSectionsList consumed by ', parameters);
    return res.json(applicationsections);
  } catch (error) {
    logError('Error in Controller ApplicationSections getApplicationSectionsList details ', error, parameters);
    logError('Error in Controller ApplicationSections getApplicationSectionsList compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}
async function getApplicationSectionsListByUserTypeId(parameters, res) {
  try {
    const applicationsections = await UserSectionPermissions.findAll({
      raw: true,
      nest: true,
      attributes: ['applicationSectionId'],
      where: {
        [Op.and]: [
          { active: true },
          { userTypeId: parameters.UserType.id },
        ],
      },
    });
    logMessage(JSON.stringify(applicationsections));
    logMessage(`ApplicationSections Controller getApplicationSectionsList consumed by ${JSON.stringify(parameters)}`);
    return res.json(applicationsections);
  } catch (error) {
    logError('Error in Controller ApplicationSections getApplicationSectionsList details ', error, parameters);
    logError('Error in Controller ApplicationSections getApplicationSectionsList compressed', error.response ? error.response.data : error.message, parameters);
    return returnError(error, res);
  }
}

module.exports.getApplicationSectionsList = getApplicationSectionsList;
module.exports.getApplicationSectionsListByUserTypeId = getApplicationSectionsListByUserTypeId;
