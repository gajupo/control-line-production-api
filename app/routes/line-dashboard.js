const express = require('express');
const {
  getProductionLines: ldGetProductionLines,
  getProductionLine: ldGetProductionLine,
  getProductionCompliance: ldGetProductionCompliance,
} = require('../controllers/line-dashboard');

const router = express.Router();

/**
 * GET /api/line-dashboard/productionlines/customer/6
 */
router.get('/productionlines/customer/:customerId', async (req, res) => {
  await ldGetProductionLines(req, res);
});

/**
   * GET /api/line-dashboard/productionline/1
   */
router.get('/productionline/:lineId', async (req, res) => {
  await ldGetProductionLine(req, res);
});

/**
   * GET /api/line-dashboard/productioncompliance/1
   */
router.get('/productioncompliance/:lineId', async (req, res) => {
  await ldGetProductionCompliance(req, res);
});
module.exports = router;
