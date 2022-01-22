const { logger } = require('../helpers/logger');
/* eslint-disable no-case-declarations */
function errorHandler(err, req, res, next) {
  switch (true) {
    case typeof err === 'string':
      // custom application error
      const is404 = err.toLowerCase().endsWith('not found');
      const statusCode = is404 ? 404 : 400;
      logger.error(`Path not found ${req.protocol}://${req.get('host')}${req.originalUrl}`);
      return res.status(statusCode).json({ message: err });
    case err.name === 'UnauthorizedError':
      // jwt authentication error
      logger.error(err);
      return res.status(401).json({ message: 'Unauthorized' });
    default:
      logger.error(err.message);
      return res.status(500).json({ message: err.message });
  }
}
function asyncMiddleware(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (ex) {
      next(ex);
    }
  };
}
module.exports.errorHandler = errorHandler;
module.exports.asyncMiddleware = asyncMiddleware;
