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
function getShiftMinutes(shiftStringTime) {
    let re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
    let timeArray = shiftStringTime.toString().match(re);
    let minutes = 0;
    if(timeArray){
        const today = utcToZonedTime(new Date(), "America/Mexico_City");
        const isoDate = datefns.formatISO(today, { representation: 'date' }) + ' ' + shiftStringTime;
        minutes = new Date(isoDate).getMinutes();
    }
    console.log(minutes);
    return minutes;
}
function getShiftSeconds(shiftStringTime) {
    let re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
    let timeArray = shiftStringTime.toString().match(re);
    let minutes = 0;
    if(timeArray){
        const today = utcToZonedTime(new Date(), "America/Mexico_City");
        const isoDate = datefns.formatISO(today, { representation: 'date' }) + ' ' + shiftStringTime;
        minutes = new Date(isoDate).getSeconds();
    }
    return minutes;
}
function getShiftDifferenceInMinutes(shiftStrStartTime, shiftStrEndTime) {
    let re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
    let startTimeArray = shiftStrStartTime.toString().match(re);
    let endTimeArray = shiftStrEndTime.toString().match(re);
    let minutes = 0;
    if(startTimeArray && endTimeArray){
        const today = utcToZonedTime(new Date(), "America/Mexico_City");
        const isoStartDate = datefns.formatISO(today, { representation: 'date' }) + ' ' + shiftStrStartTime;
        const isoEndDate = datefns.formatISO(today, { representation: 'date' }) + ' ' + shiftStrEndTime;
        minutes = datefns.differenceInMinutes(datefns.parseISO(isoEndDate),datefns.parseISO(isoStartDate),{roundingMethod:'ceil'});
    }
    console.log(minutes);
    return minutes;

}
function Round(value) {
    const neat = +(Math.abs(value).toPrecision(15));
    const rounded = Math.round(neat * 100) / 100;

    return rounded * Math.sign(value);
}
module.exports.isObject = isObject;
module.exports.isArray = isArray;
module.exports.getShiftHour = getShiftHour;
module.exports.getShiftMinutes = getShiftMinutes;
module.exports.Round = Round;
module.exports.getShiftDifferenceInMinutes = getShiftDifferenceInMinutes;
module.exports.getShiftSeconds = getShiftSeconds;