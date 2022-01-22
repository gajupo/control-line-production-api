const winston = require('winston');
const { unHandledExceptionsTransport } = require('./logger');

module.exports = () => {
  // catch uncaught exceptions and unhandledRejection
  winston.exceptions.handle(unHandledExceptionsTransport);
  // will re-throw to winston unhandled promise rejections
  process.on('unhandledRejection', (ex) => {
    throw ex;
  });
};
