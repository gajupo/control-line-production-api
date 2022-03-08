const { logError, logger } = require('../helpers/logger');
const { UserSectionPermissions, ApplicationSections } = require('../models');
const { internalServerError } = require('./core');

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

module.exports.getSectionPermissionsList = getSectionPermissionsList;
