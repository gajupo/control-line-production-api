'use strict';

function successfulOperation(message, res, propName = undefined, value = undefined ) {
    var response = {
        statusCode: 200,
        message: message
    };
    if (propName) {
        response[propName] = value;
    }
    res.status(200).json(response);
}

function notFoundError(message, res) {
    errorMessage(message, 'Not found', 404, res);
}

function internalServerError(message, res) {
    errorMessage(message, 'Internal server error', 500, res);
}

function badRequestError(message, res, errorList = undefined) {
    errorMessage(message, 'Bad request error', 400, res, errorList);
}

function errorMessage(message, description, statusCode, res, errorList = undefined) {
    var response = {
        statusCode: statusCode,
        error: description,
        message: message
    };
    if (errorList) {
        response.errorList = errorList;
    }
    res.status(statusCode).json(response);
}

module.exports.notFoundError = notFoundError;
module.exports.successfulOperation = successfulOperation;
module.exports.internalServerError = internalServerError;
module.exports.badRequestError = badRequestError;
