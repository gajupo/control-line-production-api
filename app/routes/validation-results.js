const express = require('express');
const {
  getValidationResultsPerHour,
  getAllCustomersProductionLinesCurrentShift,
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
router.get('/allcustomerslines', async (req, res) => {
  await getAllCustomersProductionLinesCurrentShift(req, res);
});
module.exports = router;
