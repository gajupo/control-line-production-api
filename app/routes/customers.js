const express = require('express');
const { getCustomerList } = require('../controllers/customer');

const router = express.Router();

/**
 * GET /api/customers
 */
router.get('/', async (req, res, next) => {
  await getCustomerList(res, next);
});

module.exports = router;
