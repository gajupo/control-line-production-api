const express = require('express');
const { getCustomerList, getCustomerLogoAsBase64 } = require('../controllers/customer');

const router = express.Router();

/**
 * GET /api/customers
 */
router.get('/', async (req, res, next) => {
  await getCustomerList(res, next);
});
/**
 * @description
 * return the customer logo image as base64 string
 * GET /api/getCustomerLogo/:customerId
 */
router.get('/getCustomerLogo/:customerId', async (req, res, next) => {
  try {
    // eslint-disable-next-line prefer-destructuring
    const customerId = req.params.customerId;
    const imageAsByteArray = await getCustomerLogoAsBase64(customerId);
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(imageAsByteArray, 'base64'); // Send the file data to the browser.
  } catch (error) {
    res.status(404).json({ message: 'FILE NOT FOUND' });
  }
});

module.exports = router;
