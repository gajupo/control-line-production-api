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
function getShifTimeTotaltSeconds(shiftStringTime) {
    let re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
    let timeArray = shiftStringTime.toString().match(re);
    let seconds = 0;
    if(timeArray){
        var todayTZ =  datefns.formatISO(utcToZonedTime(new Date(), "America/Mexico_City"),{ representation: 'date' });
        const todayISOWithTime = todayTZ + ' 00:00:00';
        const shiftTimeIsoDate = todayTZ + ' ' + shiftStringTime;
        seconds = datefns.differenceInSeconds(datefns.parseISO(shiftTimeIsoDate), datefns.parseISO(todayISOWithTime));
    }
    return seconds;
}
function getShiftDifferenceInMinutes(shiftStrStartTime, shiftStrEndTime) {
    let minutes = 0;
    if(shiftStrStartTime && shiftStrEndTime){
        minutes = datefns.differenceInMinutes(datefns.parseISO(shiftStrStartTime),datefns.parseISO(shiftStrEndTime),{roundingMethod:'ceil'});
    }
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
module.exports.Round = Round;
module.exports.getShiftDifferenceInMinutes = getShiftDifferenceInMinutes;
module.exports.getShifTimeTotaltSeconds = getShifTimeTotaltSeconds;