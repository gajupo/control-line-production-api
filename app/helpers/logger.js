const config = require('config');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const morgan = require('morgan');

// filter function,
// that will allow logging only the specified log level
const filter = (level) => winston.format((info) => {
  if (info.level === level) {
    return info;
  }
})();
// log levels system
const levels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  http: 5,
};
const prettyJson = winston.format.printf((info) => {
  if (info.message.constructor === Object) {
    // eslint-disable-next-line no-param-reassign
    info.message = JSON.stringify(info.message, null, 4);
  }
  return `[${info.timestamp}]-${info.level}: ${info.message}`;
});
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: config.get('logger.dateFormat') }),
  winston.format.prettyPrint(),
  winston.format.splat(),
  winston.format.simple(),
  prettyJson
);
const transports = [
  new DailyRotateFile({
    filename: config.get('logger.combinedFile'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    prepend: true,
    level: 'info',
    name: 'dailyinfo',
    format: logFormat,
  }),
  new DailyRotateFile({
    filename: config.get('logger.errorFile'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    prepend: true,
    level: 'error',
    name: 'dailyerror',
    format: logFormat,
  }),
  new DailyRotateFile({
    filename: config.get('logger.httpFile'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    prepend: true,
    level: 'http',
    name: 'dailyhttp',
    format: filter('http'),
  }),
  // create a logging target for debug logs
  new winston.transports.Console({
    level: 'debug',
    name: 'consoleinfo',
    // specify format for the target
    format: winston.format.combine(
      // process only debug logs
      filter('debug'),
      // colorize the output
      winston.format.colorize(),
      // add a timestamp
      winston.format.timestamp(),
      // use simple form
      winston.format.simple()
    ),
  }),
];
const unHandledExceptionsTransport = [
  new DailyRotateFile({
    filename: config.get('logger.errorFile'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    prepend: true,
    level: 'error',
    name: 'dailyerror',
    format: logFormat,
  }),
  new winston.transports.Console({ colorize: true, prettyPrint: true }),
];
const logger = winston.createLogger({
  // specify the own log levels system
  levels: levels,
  // specify the logging targets
  transports: transports,
});
// Logger to mongo example
// app.use(
//   morgan(
//     {
//       dbName: 'simpl_logs',
//       collection: 'simpl_api',
//       connectionString: 'mongodb://mongo:27017/',
//       user: 'root',
//       pass: 'simpl2022',
//     },
//     {}, 'combined'
//   )
// );
// create a Morgan middleware instance
// store 500 errors on a file
const morganMiddleware = morgan('combined', {
  // specify a function for skipping requests without errors
  skip: (req, res) => res.statusCode < 400,
  // specify a stream for requests logging
  stream: {
    write: (msg) => logger.http(msg),
  },
});
function logError(message, error, payload = undefined) {
  const log = { message: message, error: error };
  if (payload) {
    log.payload = payload;
  }
  logger.error('%o', log);
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
module.exports.unHandledExceptionsTransport = unHandledExceptionsTransport;
module.exports.morganMiddleware = morganMiddleware;
