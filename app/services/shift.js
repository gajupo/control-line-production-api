const _ = require('lodash');
const { utcToZonedTime } = require('date-fns-tz');
const datefns = require('date-fns');
const { Op, Sequelize } = require('sequelize');
const { ProductionLineShiftHistory } = require('../models');

async function getCurrentShift(productionLineId) {
  try {
    const shiftHistory = await ProductionLineShiftHistory.findAll({
      attributes: [
        [Sequelize.fn('MAX', Sequelize.col('ShiftStartDateTime')), 'shiftStartDateTime'],
      ],
      where: {
        ProductionLineId: productionLineId,
      },
      mapToModel: true,
    });
    console.log(Object.values(shiftHistory));
    return _.first(shiftHistory);
  } catch (error) {
    throw new Error(error);
  }
}
function getShiftDifferenceInMinutes(shiftStrStartTime, shiftStrEndTime) {
  let minutes = 0;
  if (shiftStrStartTime && shiftStrEndTime) {
    minutes = datefns.differenceInMinutes(datefns.parseISO(shiftStrStartTime), datefns.parseISO(shiftStrEndTime), { roundingMethod: 'ceil' });
  }
  return minutes;
}
function getShiftDifferenceInDays(strStartDate, strEndDate) {
  let days = 0;
  if (strStartDate && strEndDate) {
    days = datefns.differenceInDays(datefns.parseISO(strStartDate), datefns.parseISO(strEndDate), { roundingMethod: 'floor' });
  }
  return days;
}
function getShiftDifferenceInHours(strStartDate, strEndDate) {
  let days = 0;
  if (strStartDate && strEndDate) {
    days = datefns.differenceInHours(datefns.parseISO(strStartDate), datefns.parseISO(strEndDate), { roundingMethod: 'floor' });
  }
  return days;
}
function getShifTimeTotaltSeconds(shiftStringTime) {
  const re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
  const timeArray = shiftStringTime.toString().match(re);
  let seconds = 0;
  if (timeArray) {
    const todayTZ = datefns.formatISO(utcToZonedTime(new Date(), 'America/Mexico_City'), { representation: 'date' });
    const todayISOWithTime = `${todayTZ} 00:00:00`;
    const shiftTimeIsoDate = `${todayTZ} ${shiftStringTime}`;
    seconds = datefns.differenceInSeconds(
      datefns.parseISO(shiftTimeIsoDate), datefns.parseISO(todayISOWithTime)
    );
  }
  return seconds;
}
function GetShiftEndAsDateTime(shiftStartDateTime, shiftStartTimeStr, shiftEndTimeStr) {
  // TODO: if the report is generated in the next day
  // prior to finish the shift the report will generate bad information
  //      because is taken the current date but not the real start and end shift time
  const shiftStartDateTimeUTCShort = datefns.formatISO(datefns.parseISO(shiftStartDateTime), { representation: 'date' });
  let dateTimeShiftEnd = '';
  const shiftStartTotalMinutes = getShifTimeTotaltSeconds(shiftStartTimeStr);
  const shiftEndTotalMinutes = getShifTimeTotaltSeconds(shiftEndTimeStr);
  if (shiftStartTotalMinutes > shiftEndTotalMinutes) {
    // we add one day to current date beacuse the end of the shift will on the next day
    const newDatePlus1Day = datefns.addDays(datefns.parseISO(shiftStartDateTimeUTCShort), 1);
    // the date time when the shift will finish if the shift ends on the next day
    dateTimeShiftEnd = `${datefns.formatISO(newDatePlus1Day, { representation: 'date' })} ${shiftEndTimeStr}`;
  } else {
    dateTimeShiftEnd = `${shiftStartDateTimeUTCShort} ${shiftEndTimeStr}`;
  }
  return dateTimeShiftEnd;
}
function GetShiftStartAsDateTime(reportDate, shiftStartStr) {
  // const rDate = utcToZonedTime(reportDate, 'America/Mexico_City');
  return `${datefns.formatISO(datefns.parseISO(reportDate), { representation: 'date' })} ${shiftStartStr}`;
}
function getShiftHour(shiftStringTime) {
  const re = /^([0-1]?\d|2[0-3])(?::([0-5]?\d))?(?::([0-5]?\d))?$/;
  const timeArray = shiftStringTime.toString().match(re);
  let hour = 0;
  if (timeArray) {
    const today = utcToZonedTime(new Date(), 'America/Mexico_City');
    const isoDate = `${datefns.formatISO(today, { representation: 'date' })} ${shiftStringTime}`;
    hour = new Date(isoDate).getHours();
  }
  console.log(hour);
  return hour;
}
module.exports.getCurrentShift = getCurrentShift;
module.exports.GetShiftEndAsDateTime = GetShiftEndAsDateTime;
module.exports.getShiftDifferenceInMinutes = getShiftDifferenceInMinutes;
module.exports.getShifTimeTotaltSeconds = getShifTimeTotaltSeconds;
module.exports.getShiftHour = getShiftHour;
module.exports.GetShiftStartAsDateTime = GetShiftStartAsDateTime;
module.exports.getShiftDifferenceInDays = getShiftDifferenceInDays;
module.exports.getShiftDifferenceInHours = getShiftDifferenceInHours;
