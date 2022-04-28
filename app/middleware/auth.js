const services = require('../services');
const { returnError } = require('../controllers/core');
const { logError, logMessage } = require('../helpers/logger');

async function auth(req, res, next) {
  const jwt = req.header('x-auth-token');
  // not only send back a 401 error also teminate de request, using return statement
  if (!jwt) res.status(401).send('Access Denied. No token provided');
  try {
    const decoded = await services.Auth.VerifyAuth(jwt);
    req.user = decoded;
    logMessage(`Auth successfully for ${JSON.stringify(decoded)}`);
    next();
  } catch (error) {
    logError('Error in Middleware Auth details ', error, req);
    logError('Error in Middleware Auth compressed', error.response ? error.response.data : error.message, req.body);
    returnError(error, res);
  }
}

module.exports.auth = auth;
