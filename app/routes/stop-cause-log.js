const express = require('express');
const {
  getActiveStopCauseLogs, getStopCauseLogsRecord,
  getActiveStopCauseLogsByCustomer, getStopCauseLogsRecordByCustomer,
} = require('../controllers/stop-cause-log');

const router = express.Router();

/**
 * GET /api/stopcauselogs
 */
router.get('/', async (req, res, next) => {
  await getActiveStopCauseLogs(res, next);
});

/**
   * GET /api/stopcauselogs/6
   */
router.get('/:customerId', async (req, res) => {
  await getActiveStopCauseLogsByCustomer(req, res);
});

/**
   * GET /api/stopcauselogs/historical
   */
router.get('/historical', async (req, res, next) => {
  await getStopCauseLogsRecord(res, next);
});

/**
   * GET /api/stopcauselogs/historical/6
   */
router.get('/historical/:customerId', async (req, res) => {
  await getStopCauseLogsRecordByCustomer(req, res);
});
module.exports = router;
