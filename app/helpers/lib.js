function isObject(obj) {
  return (!!obj) && (obj.constructor === Object);
}
function isArray(obj) {
  return (!!obj) && (obj.constructor === Array);
}

function Round(value) {
  const neat = +(Math.abs(value).toPrecision(15));
  const rounded = Math.round(neat * 100) / 100;
  return rounded * Math.sign(value);
}

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}
function getStringByStatus(value) {
  return value ? 'Activo' : 'Inactivo';
}

module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.Round = Round;
module.exports.getKeyByValue = getKeyByValue;
module.exports.getStringByStatus = getStringByStatus;
