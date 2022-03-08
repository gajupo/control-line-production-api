const express = require('express');
const {
  getSectionPermissionsList,
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
module.exports = router;
