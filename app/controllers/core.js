'use strict';

function notFoundError(message, res) {
    
    const response = {
        statusCode: 404,
        error: 'Not found',
        message: message
    };
    res.status(404).send(JSON.stringify(response, null, 2));
}

function successfulOperation(message, res) {

    const response = {
        statusCode: 200,
        message: message
    };
    res.status(200).send(JSON.stringify(response, null, 2));
}

module.exports.notFoundError = notFoundError;
module.exports.successfulOperation = successfulOperation;
