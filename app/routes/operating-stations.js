const express = require('express');
const { unblockLine } = require('../controllers/stop-cause-log');

const router = express.Router();

/**
   * PUT /api/unblock/STATION01
   */
router.put('/:stationIdentifier', async (req, res) => {
  await unblockLine(req, res);
});
module.exports = router;
