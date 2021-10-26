const express = require('express');
const {
  getProductionLines: ldGetProductionLines,
  getProductionLine: ldGetProductionLine,
  getProductionCompliance: ldGetProductionCompliance,
  getCurrentShift: ldGetCurrentShift,
  getHoursPerShift: ldGetHoursPerShift,
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
router.get('/productionline/:lineId&:shiftStart&:shiftEnd&:shiftId', async (req, res) => {
  await ldGetProductionLine(req, res);
});

/**
   * GET /api/line-dashboard/productioncompliance/1
   */
router.get('/productioncompliance/:lineId', async (req, res) => {
  await ldGetProductionCompliance(req, res);
});

/**
 * GET /api/line-dashboard/currentshift/1
 */

router.get('/currentshift/:lineId', async (req, res) =>{
  await  ldGetCurrentShift(req,res); 
});

/**
 * GET /api/line-dashboard/shiftdifference/
 */

 router.get('/shiftdifference/:startdate&:enddate', async (req, res) =>{
  await ldGetHoursPerShift(req,res); 
});
module.exports = router;