const express = require('express');
const {
    getSectionPermissionsList
} = require('../controllers/user');
const {auth} = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {Role} = require('./../helpers/role');

const router = express.Router();
/**
 * GET /api/user/sectionpermissions
 */
router.get('/sectionpermissions',[auth, authorize([Role.Administrador,Role.Supervisor, Role.Operador])], async (req, res, next) => {
  await getSectionPermissionsList(req, res, next);
});
module.exports = router;