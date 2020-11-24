'use strict';

function successfulOperation(message, res) {

    const response = {
        statusCode: 200,
        message: message
    };
    res.status(200).send(JSON.stringify(response, null, 2));
}

function notFoundError(message, res) {

    errorMessage(message, 'Not found', 404, res);
}

function internalServerError(message, res) {

    errorMessage(message, 'Internal server error', 500, res);
}

function errorMessage(message, error, statusCode, res) {
    
    const response = {
        statusCode: statusCode,
        error: error,
        message: message
    };
    res.status(statusCode).send(JSON.stringify(response, null, 2));
}

module.exports.notFoundError = notFoundError;
module.exports.successfulOperation = successfulOperation;
module.exports.internalServerError = internalServerError;
