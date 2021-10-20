const config = require('config');
const { createLogger, format } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logFormat = format.combine(
  format.timestamp({ format: config.get('logger.dateFormat') }),
  format.align(),
  format.json()
);

const transportDaylyError = new DailyRotateFile({
  filename: config.get('logger.errorFile'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  prepend: true,
  level: 'error',
});

const transportDaylyCombines = new DailyRotateFile({
  filename: config.get('logger.combinedFile'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  prepend: true,
  level: 'info',
});

//    format: format.combine(
//     format.timestamp({
//         format: config.get("logger.dateFormat")
//     }),
//     format.splat(),
//     format.json()
//     //format.prettyPrint()
//     )

const logger = createLogger({
  format: logFormat,
  defaultMeta: { service: config.get('name') },
  transports: [transportDaylyError, transportDaylyCombines],
});

function logError(message, error, payload = undefined) {
  const log = { message: message, error: error };
  if (payload) {
    log.payload = payload;
  }
  logger.error(log);
}

function logMessage(message, payload = undefined) {
  const log = { message: message };
  if (payload) {
    log.payload = payload;
  }
  logger.info(log);
}

module.exports.logger = logger;
module.exports.logError = logError;
module.exports.logMessage = logMessage;
