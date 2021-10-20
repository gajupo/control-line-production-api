const express = require('express');
const { getShiftsPerProductionLine } = require('../controllers/shifts');

const router = express.Router();

/**
 * GET /api/shifts/productionline/2
 */
router.get('/productionline/:productionLineId', async (req, res) => {
  await getShiftsPerProductionLine(req, res);
});
module.exports = router;
