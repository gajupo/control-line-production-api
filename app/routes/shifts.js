const express = require('express');
const { getShiftsPerProductionLine,getCurrentShiftProductionLine } = require('../controllers/shifts');

const router = express.Router();

/**
 * GET /api/shifts/productionline/2
 */
router.get('/productionline/:productionLineId', async (req, res) => {
  await getShiftsPerProductionLine(req, res);
});

/**
 * GET /api/shifts/currentshift/1/1
 */
router.get('/currentshift/:productionLineId/:customerId', async(req, res) =>{
  await getCurrentShiftProductionLine(req, res);
})
module.exports = router;