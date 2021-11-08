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
 * @description
 * return all neccessary information to show in the line panel
 * - rates
 * - validation count
 * - validation by station
 * - and rates by hour
  * GET /api/line-dashboard/productionline/1/1/1/2021-10-10 06:00:00/2021-10-10 15:00:00
*/
router.get('/productionline/:customerId/:productionLineId/:shiftId/:shiftStartedDateTime/:shiftEndDateTime', async (req, res) => {
  const parametes = {
    CustomerId: req.params.customerId,
    ProductionLineId: req.params.productionLineId,
    ShiftId: req.params.shiftId,
    ShiftStartedDateTime: req.params.shiftStartedDateTime,
    ShiftEndDateTime: req.params.shiftEndDateTime,
    ShiftStartStr: req.params.shiftStartedDateTime.split(' ')[1],
    ShiftEndStr: req.params.shiftEndDateTime.split(' ')[1],
  };
  await ldGetProductionLine(parametes, res);
});

/**
   * GET /api/line-dashboard/productioncompliance/1
   */
router.get('/productioncompliance/:lineId', async (req, res) => {
  await ldGetProductionCompliance(req, res);
});
module.exports = router;
