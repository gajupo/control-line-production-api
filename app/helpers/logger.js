'use strict';

const {createLogger, format, transports} = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.splat(),
        format.json(),
        format.prettyPrint()
    ),
    defaultMeta: { service: 'simpl-dashboard-api' },
    transports: [
        new transports.File({ filename: 'app/logs/error.log', level: 'error' }),
        new transports.File({ filename: 'app/logs/combined.log' }),
    ],
});

function logError(message, error, payload = undefined) {

    var log = { 'message': message, 'error': error };
    if (payload) {
        log.payload = payload;
    }
    logger.error(log);
}

function logMessage(message, payload = undefined) {

    var log = { 'message': message };
    if (payload) {
        log.payload = payload;
    }
    logger.info(log);
}

module.exports.logger = logger;
module.exports.logError = logError;
module.exports.logMessage = logMessage;
