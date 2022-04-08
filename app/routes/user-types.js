const express = require('express');
const {
  getUserTypesList,
  setBulkUpdate,
} = require('../controllers/user-types');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Role } = require('../helpers/role');

const router = express.Router();

/**
 * GET /api/usertype/usertypes
 */
router.get('/usertypes', [auth, authorize([Role.Administrador])], async (req, res) => {
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
module.exports = router;
