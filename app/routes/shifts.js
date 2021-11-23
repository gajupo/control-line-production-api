const express = require('express');
const { getShiftsPerProductionLine, getCurrentShiftProductionLine, getChangeShiftInMinutes } = require('../controllers/shifts');

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
router.get('/currentshift/:productionLineId/:customerId', async (req, res) => {
  await getCurrentShiftProductionLine(req, res);
});

/**
 * GET /api/shifts/changeshift/shiftstartdatetime/shiftenddatetime
 */
router.get('/changeshift/:shiftstartdatetime/:shiftenddatetime', async (req, res) => {
  await getChangeShiftInMinutes(req, res);
});
module.exports = router;
