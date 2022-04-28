const express = require('express');
const {
  getApplicationSectionsList,
  getApplicationSectionsListByUserTypeId,
} = require('../controllers/application-sections');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Role } = require('../helpers/role');

const router = express.Router();

/**
 * GET /api/applicationsection/applicationsections
 */
router.get('/', [auth], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  await getApplicationSectionsList(parameters, res);
});
/**
 * @description
 * param {body} usertype
 * return the sectionspermissions by usertype id from edit sectionspermissions user
 * GET /api/applicationsection/getApplicationSections/
 */
router.post('/getApplicationSections', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    UserType: req.body.usertype,
  };
  await getApplicationSectionsListByUserTypeId(parameters, res);
});

module.exports = router;
