const _ = require('lodash/core');

function isObject(obj) {
    return (!!obj) && (obj.constructor === Object);
}
function isArray(obj) {
    return (!!obj) && (obj.constructor === Array);
}

module.exports.isObject = isObject;
module.exports.isArray = isArray;