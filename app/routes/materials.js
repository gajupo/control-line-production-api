const express = require('express');
const { getMaterialList, getMaterialListPerCustomer } = require('../controllers/materials');

const router = express.Router();

/**
 * GET /api/materials
 */
router.get('/', async (req, res) => {
  await getMaterialList(res);
});
/**
   * GET /api/materials/client/6
   */
router.get('/client/:id', async (req, res) => {
  await getMaterialListPerCustomer(req, res);
});
module.exports = router;
