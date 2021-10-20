const express = require('express');
const {
  getProductionLines, getProductionLinesPerCustomerCurrentShift,
  getProductionLinesPerCustomer,
} = require('../controllers/production-lines');

const router = express.Router();

/**
 * GET /api/productionlines
 */
router.get('/', async (req, res) => {
  await getProductionLines(res);
});
/**
 * GET /api/productionlines/shift/customer/15
 */
router.get('/shift/customer/:customerId', async (req, res) => {
  await getProductionLinesPerCustomerCurrentShift(req, res);
});
/**
   * GET /api/productionlines/customer/15
   */
router.get('/customer/:customerId', async (req, res) => {
  await getProductionLinesPerCustomer(req, res);
});
module.exports = router;
