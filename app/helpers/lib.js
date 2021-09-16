const _ = require('lodash/core');
const { utcToZonedTime,format } = require('date-fns-tz');
const datefns = require('date-fns');
function isObject(obj) {
    return (!!obj) && (obj.constructor === Object);
}
function isArray(obj) {
    return (!!obj) && (obj.constructor === Array);
}
function getShiftHour(shiftStringTime) {
    let re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
    let timeArray = shiftStringTime.toString().match(re);
    let hour = 0;
    if(timeArray){
        const today = utcToZonedTime(new Date(), "America/Mexico_City");
        const isoDate = datefns.formatISO(today, { representation: 'date' }) + ' ' + shiftStringTime;
        hour = new Date(isoDate).getHours();
    }
    console.log(hour);
    return hour;

}
module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.getShiftHour = getShiftHour;