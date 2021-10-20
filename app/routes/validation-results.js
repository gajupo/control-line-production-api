const express = require('express');
const { getValidationResultsPerHour } = require('../controllers/validation-results');

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
module.exports = router;
