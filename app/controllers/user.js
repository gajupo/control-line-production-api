const { logError, logger } = require('../helpers/logger');
const { UserSectionPermissions, ApplicationSections } = require('../models');
const { internalServerError } = require('./core');

// eslint-disable-next-line no-unused-vars
async function getSectionPermissionsList(req, res, next) {
    try {
        const sectionpermissions = await ApplicationSections.findAll({
            raw: true,
            nest: true,
            attributes: ['sectionName'],
            include: {
                model: UserSectionPermissions,
                attributes: [],
                where: {
                    userTypeId : req.user.rolId,
                    active: true
                }
            },
        }).then(sections => {
            if(sections){
                return sections.map( section => section.sectionName);
            }else{
                throw new Error("Error in get section permissions for the user.");
            }
        });
        logger.debug('User sectionpermissions found ', sectionpermissions);
        return res.json(sectionpermissions);
    } catch (error) {
        logError('Error in getSectionPermissionsList', error);
        return internalServerError('Internal server error', res);
    }
}

module.exports.getSectionPermissionsList = getSectionPermissionsList;