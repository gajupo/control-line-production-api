const config = require('config');
const { createLogger, format } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const prettyJson = format.printf((info) => {
  if (info.message.constructor === Object) {
    // eslint-disable-next-line no-param-reassign
    info.message = JSON.stringify(info.message, null, 4);
  }
  return `[${info.timestamp}]-${info.level}: ${info.message}`;
});
const logFormat = format.combine(
  format.timestamp({ format: config.get('logger.dateFormat') }),
  format.prettyPrint(),
  format.splat(),
  format.simple(),
  prettyJson
);

const transportDaylyError = new DailyRotateFile({
  filename: config.get('logger.errorFile'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  prepend: true,
  level: 'error',
  name: 'dailyerror',
});

const transportDaylyCombines = new DailyRotateFile({
  filename: config.get('logger.combinedFile'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  prepend: true,
  level: 'info',
  name: 'dailyinfo',
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
