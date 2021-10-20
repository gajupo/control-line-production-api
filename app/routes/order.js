const express = require('express');
const {
  getCurrentOrders, getCustomerOrders,
  scanOrderProduct, closeOrder, createNewOrder,
} = require('../controllers/orders');

const router = express.Router();
/**
 * GET /api/orders
 */
router.get('/', async (req, res, next) => {
  await getCurrentOrders(res, next);
});

/**
   * PUT /api/order/scan/15
   */
router.put('/scan/:orderId', async (req, res) => {
  await scanOrderProduct(req, res);
});

/**
   * PUT /api/order/close/22
   */
router.put('/close/:orderId', async (req, res) => {
  await closeOrder(req, res);
});

/**
   * GET /api/customers/id
   */
router.get('/:id', async (req, res) => {
  await getCustomerOrders(req, res);
});
/**
 * POST /api/orders/new
 *
 * {
 *      "productionLineId": 1,
 *      "materialId": 5
 * }
 */
router.post('/new', async (req, res) => {
  await createNewOrder(req, res);
});
module.exports = router;
