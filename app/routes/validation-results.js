const express = require('express');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Role } = require('../helpers/role');
const {
  getValidationResultsPerHour,
  getAllCustomersProductionLinesCurrentShift,
  getAllCustomersProductionLinesCurrentShiftByUserId,
} = require('../controllers/validation-results');

const router = express.Router();

/**
 * POST /api/validationresults/perhour/
 *
 * {
 *      "customerId": 1,
 *      "shiftId": 1,
 *      "productionLineId": 1,
 *      "date": "2021-07-20T14:34:41.157Z"
 * }
 */
router.post('/perhour', async (req, res) => {
  await getValidationResultsPerHour(req, res);
});
/**
 * Returns information like goal, scanned meterials for all customers
 * Returns an array of line with its related information about production
 * GET /api/productionlines/shift/customer/15
 */
router.get('/allcustomerslines', [auth, authorize([Role.Administrador, Role.Supervisor])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  if (parameters.RolId === Role.Administrador) {
    await getAllCustomersProductionLinesCurrentShift(res);
  } else {
    await getAllCustomersProductionLinesCurrentShiftByUserId(parameters, res);
  }
});
module.exports = router;
