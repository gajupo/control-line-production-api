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

function getHoursPerShift(line) {
    if (line.hasOwnProperty('Shifts') && line.Shifts.length == 1) {
        const shift = line.Shifts[0];
        return Math.ceil(shift.shiftEnd - shift.shiftStart);
    }
    return 0;
}

function getProductionGoal(line, shiftHours) {
    let goal = 0;
    if (line.hasOwnProperty('Orders')) {
        const orders = line.Orders;
        orders.forEach(order => {
            const material = order.Material;
            const orderGoal = shiftHours * material.productionRate;

            goal += orderGoal;
        });
    }
    return goal;
}

function getProductionRate(validationResultCount, productionRate) {
    if (productionRate == 0) {
        return 0;
    }
    return Math.ceil((validationResultCount / productionRate) * 100);
}

module.exports.notFoundError = notFoundError;
module.exports.successfulOperation = successfulOperation;
module.exports.internalServerError = internalServerError;
module.exports.badRequestError = badRequestError;
module.exports.getHoursPerShift = getHoursPerShift;
module.exports.getProductionGoal = getProductionGoal;
module.exports.getProductionRate = getProductionRate;
