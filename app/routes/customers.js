const express = require('express');
const {
  getCustomerList: ldGetCustomerList,
  getCustomerListByUserId: ldGetCustomerListByUserId,
  getCustomerLogoAsBase64: ldGetCustomerLogoAsBase64,
} = require('../controllers/customer');
const { auth } = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Role } = require('../helpers/role');

const router = express.Router();

/**
 * GET /api/customers
 */
// eslint-disable-next-line no-unused-vars
router.get('/', [auth, authorize([Role.Administrador, Role.Supervisor])], async (req, res) => {
  const parameters = {
    UserId: req.user.userId,
    RolId: req.user.rolId,
    UserName: req.user.userName,
    Name: req.user.name,
  };
  if (parameters.RolId === Role.Administrador) {
    await ldGetCustomerList(res);
  } else {
    await ldGetCustomerListByUserId(parameters, res);
  }
});
/**
 * @description
 * return the customer logo image as base64 string
 * GET /api/getCustomerLogo/:customerId
 */
router.get('/getCustomerLogo/:customerId', async (req, res) => {
  try {
    // eslint-disable-next-line prefer-destructuring
    const customerId = req.params.customerId;
    const imageAsByteArray = await ldGetCustomerLogoAsBase64(customerId);
    // res.writeHead(200, { 'Content-Type': 'image/png' });
    // res.end(imageAsByteArray, 'base64'); // Send the file data to the browser.
    res.end(imageAsByteArray);
  } catch (error) {
    res.status(404).json({ message: 'FILE NOT FOUND' });
  }
});

module.exports = router;
