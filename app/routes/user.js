const express = require('express');
const {
  getSectionPermissionsList,
  getUsersList,
  getUser,
  setBulkUpdate,
  setProfileUpdateStatus,
  setProfileUpdateGeneral,
  setCustomersLinesbyUser,
} = require('../controllers/user');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Role } = require('../helpers/role');

const router = express.Router();
/**
 * GET /api/user/sectionpermissions
 */
router.get('/sectionpermissions', [auth, authorize([Role.Administrador, Role.Supervisor, Role.Operador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  await getSectionPermissionsList(parameters, res);
});
/**
 * GET /api/user/users
 */
router.get('/users', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  await getUsersList(parameters, res);
});
/**
 * GET /api/user/user
 */
router.get('/user', [auth, authorize([Role.Administrador, Role.Supervisor, Role.Operador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  await getUser(parameters, res);
});
/**
 * POST /api/user/bulkupdate
 */
router.post('/bulkupdate', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    users: req.body.users,
    status: req.body.type === 2,
  };
  await setBulkUpdate(parameters, res);
});
/**
 * POST /api/user/profileupdate
 */
router.post('/profileupdate', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    user: req.body.user,
  };
  if (req.body.type === 1) {
    await setProfileUpdateStatus(parameters, res);
  }
  if (req.body.type === 2) {
    await setProfileUpdateGeneral(parameters, res);
  }
});
router.post('/customerslinesupdate', [auth, authorize([Role.Administrador])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    user: req.body.user,
    customersDelete: req.body.customersDelete,
    customersAdd: req.body.customersAdd,
  };
  await setCustomersLinesbyUser(parameters, res);
});
module.exports = router;
