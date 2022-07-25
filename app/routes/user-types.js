const express = require('express');
const {
  getUserTypesList,
  setBulkUpdate,
  setRolUpdateStatus,
  setRolUpdateGeneral,
  setSectionPermissionsbyUserType,
} = require('../controllers/user-types');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Role } = require('../helpers/role');

const router = express.Router();

/**
 * GET /api/usertype/usertypes
 */
router.get('/usertypes', [auth], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  await getUserTypesList(parameters, res);
});

/**
 * POST /api/usertype/bulkupdate
 */
router.post('/bulkupdate', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    users: req.body.users,
    type: req.body.type === 2,
  };
  await setBulkUpdate(parameters, res);
});
/**
 * POST /api/usertype/rolupdate
 */
router.post('/rolupdate', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    usertype: req.body.usertype,
  };
  if (req.body.type === 1) {
    await setRolUpdateStatus(parameters, res);
  }
  if (req.body.type === 2) {
    await setRolUpdateGeneral(parameters, res);
  }
});
// setSectionPermissionsbyUserType
router.post('/sectionpermissionsupdate', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    usertype: req.body.usertype,
    sectionpermissionsDelete: req.body.sectionpermissionsDelete,
    sectionpermissionsAdd: req.body.sectionpermissionsAdd,
  };
  await setSectionPermissionsbyUserType(parameters, res);
});
module.exports = router;
