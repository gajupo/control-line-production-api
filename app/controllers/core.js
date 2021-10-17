const { utcToZonedTime } = require('date-fns-tz');

function successfulOperation(message, res, propName = undefined, value = undefined) {
  const response = {
    statusCode: 200,
    message: message,
  };
  if (propName) {
    response[propName] = value;
  }
  res.status(200).json(response);
}
function errorMessage(message, description, statusCode, res, errorList = undefined) {
  const response = {
    statusCode: statusCode,
    error: description,
    message: message,
  };
  if (errorList) {
    response.errorList = errorList;
  }
  res.status(statusCode).json(response);
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
function getHoursPerShift(line) {
  if (Object.prototype.hasOwnProperty.call(line, 'Shifts') && line.Shifts.length === 1) {
    const today = utcToZonedTime(new Date(), 'America/Mexico_City');
    const shift = line.Shifts[0];
    return Math.ceil(shift.shiftEnd - today.getHours());
  }
  return 0;
}

function getProductionGoal(line, shiftHours) {
  let goal = 0;
  if (Object.prototype.call(line, 'Orders')) {
    const orders = line.Orders;
    orders.forEach((order) => {
      const material = order.Material;
      const orderGoal = shiftHours * material.productionRate;

      goal += orderGoal;
    });
  }
  return goal;
}

function getProductionRate(validationResultCount, goal) {
  if (goal === 0) {
    return 0;
  }
  return Math.ceil((validationResultCount / goal) * 100);
}

module.exports.notFoundError = notFoundError;
module.exports.successfulOperation = successfulOperation;
module.exports.internalServerError = internalServerError;
module.exports.badRequestError = badRequestError;
module.exports.getHoursPerShift = getHoursPerShift;
module.exports.getProductionGoal = getProductionGoal;
module.exports.getProductionRate = getProductionRate;
