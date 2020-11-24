'use strict';

function notFoundError(message, res) {
    
    const response = {
        statusCode: 404,
        error: 'Not found',
        message: message
    }
    res.status(404).send(JSON.stringify(response, null, 2));
}

module.exports.notFoundError = notFoundError;
