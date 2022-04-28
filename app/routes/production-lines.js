const express = require('express');
const {
  getProductionLines, getProductionLinesPerCustomerCurrentShift,
  getProductionLinesPerCustomer, getProductionLinesPerCustomerCurrentShiftByUser,
} = require('../controllers/production-lines');
const { auth } = require('../middleware/auth');
const { Role } = require('../helpers/role');

const router = express.Router();

/**
 * GET /api/productionlines
 */
router.get('/', async (req, res) => {
  await getProductionLines(res);
});
/**
 * Returns information like goal, scanned meterials for the given customer
 * Returns an array of line with its related information about production
 * GET /api/productionlines/shift/customer/15
 */
router.get('/shift/customer/:customerId', [auth], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
    CustomerId: req.params.customerId,
  };
  if (parameters.RolId === Role.Administrador) {
    await getProductionLinesPerCustomerCurrentShift(parameters, res);
  } else {
    await getProductionLinesPerCustomerCurrentShiftByUser(parameters, res);
  }
});
/**
   * GET /api/productionlines/customer/15
   */
router.get('/customer/:customerId', async (req, res) => {
  await getProductionLinesPerCustomer(req, res);
});
module.exports = router;
