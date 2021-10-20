const express = require('express');
const { getPaginatedScannedReportList, getScannedReportList } = require('../controllers/reports');

const router = express.Router();

/**
 * POST /api/reportlist/1
 *
 * {
 *     "pasPN": "290D2851G001",
 *     "scanDate":
 *     {
 *         "from": "2020-11-27T14:34:41.157Z",
 *         "to": "2020-11-27T20:37:48.330Z"
 *     }
 * }
 */
router.post('/:page', async (req, res) => {
  await getPaginatedScannedReportList(req, res);
});
/**
   * POST /api/reportlist/
   *
   * {
   *     "pasPN": "290D2851G001",
   *     "scanDate":
   *     {
   *         "from": "2020-11-27T14:34:41.157Z",
   *         "to": "2020-11-27T20:37:48.330Z"
   *     }
   * }
   */
router.post('/', async (req, res) => {
  await getScannedReportList(req, res);
});

module.exports = router;
