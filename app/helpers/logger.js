'use strict';

const config = require('config');
const {createLogger, format, transports} = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({
            format: config.get("logger.dateFormat")
        }),
        format.splat(),
        format.json(),
        format.prettyPrint()
    ),
    defaultMeta: { service: config.get("name") },
    transports: [
        new transports.File({ filename: config.get("logger.errorFile"), level: 'error' }),
        new transports.File({ filename: config.get("logger.combinedFile") }),
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
