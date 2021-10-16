const _ = require('lodash/core');
const { utcToZonedTime,format } = require('date-fns-tz');
const datefns = require('date-fns');
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
module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.Round = Round;