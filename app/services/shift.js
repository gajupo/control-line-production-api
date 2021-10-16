const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelize } = require("../helpers/sequelize");
const models = require("../models");
const datefns = require('date-fns');
const { utcToZonedTime, format, zonedTimeToUtc } = require('date-fns-tz');
async function getCurrentShift(productionLine) {

    //const fractionalHours = dateTime.getHours() + (dateTime.getMinutes() / 60);
    try {
      //TODO: This implementation is obsolete, take as an example the funtion getProductionLinesAndShiftsByCustomeron production line services
        const shift = await sequelize.query(
            `select TOP 1 Shifts.*
            from ProductionLines
            inner join ProductionLineShifts on ProductionLines.Id = ProductionLineShifts.ProductionLineId
            inner join Shifts on Shifts.Id = ProductionLineShifts.ShiftId
            where ProductionLines.Id = $productionLineId and CAST(Shifts.ShiftStart AS FLOAT) <= CAST(FORMAT(GETDATE(),'HH.mm') AS FLOAT) and CONVERT(FLOAT, Shifts.ShiftEnd) >= CAST(FORMAT(GETDATE(),'HH.mm') AS FLOAT)`,
            {
              model: models.Shift,
              mapToModel: true,
              bind: {productionLineId: productionLine},
              type: QueryTypes.SELECT
            }
          );

          if((Object.keys(shift).length > 0))
            return Object.values(shift)[0]
          else
            throw new Error("Shift not found!")
    } catch (error) {
        throw new Error(error);
    }
    

    //const shifts = await getShiftsPerProductionLineImpl(productionLine);
    //const shift = shifts.find(s => fractionalHours >= s.shiftStart && fractionalHours <= s.shiftEnd);
   
}
function GetShiftEndAsDateTime(shiftStartDateTime, shiftStartTimeStr,shiftEndTimeStr)
{
  //TODO: if the report is generated in the next day prior to finish the shift the report will generate bad information
  //      because is taken the current date but not the real start and end shift time
    let shiftStartDateTimeUTCShort = datefns.formatISO(shiftStartDateTime, { representation: 'date' });
    let dateTimeShiftEnd = '';
    let shiftStartTotalMinutes = getShifTimeTotaltSeconds(shiftStartTimeStr);
    let shiftEndTotalMinutes = getShifTimeTotaltSeconds(shiftEndTimeStr);
    if(shiftStartTotalMinutes > shiftEndTotalMinutes){
        //we add one day to current date beacuse the end of the shift will on the next day
        let newDatePlus1Day = datefns.addDays(datefns.parseISO(shiftStartDateTimeUTCShort),1);
        // the date time when the shift will finish if the shift ends on the next day
        dateTimeShiftEnd = datefns.formatISO(newDatePlus1Day, { representation: 'date' }) + ' ' + shiftEndTimeStr;
    }
    else
    {
        dateTimeShiftEnd = datefns.formatISO(shiftStartDateTime, { representation: 'date' }) + ' ' + shiftEndTimeStr;
    }
    return dateTimeShiftEnd;
}
function GetShiftStartAsDateTime(shiftStartStr,shiftEndStr)
{
  //TODO: if the report is generated in the next day prior to finish the shift the report will generate bad information
  //      because is taken the current date but not the real start and end shift time
    let todayTZ = utcToZonedTime(new Date(), "America/Mexico_City");
    let dateTimeShiftStart = '';
    let dateTimeShiftEnd = GetShiftEndAsDateTime(shiftStartStr,shiftEndStr);
    let shiftStartTotalMinutes = getShifTimeTotaltSeconds(shiftStartStr);
    let shiftEndTotalMinutes = getShifTimeTotaltSeconds(shiftEndStr);
    if(shiftStartTotalMinutes > shiftEndTotalMinutes ){
        //we add one day to current date beacuse the end of the shift will on the next day
        let newDatePlus1Day = datefns.addDays(datefns.parseISO(dateTimeShiftEnd),-1);
        // the date time when the shift will finish if the shift ends on the next day
        dateTimeShiftStart = datefns.formatISO(newDatePlus1Day, { representation: 'date' }) + ' ' + shiftStartStr;
    }
    else
    {
        dateTimeShiftStart = datefns.formatISO(todayTZ, { representation: 'date' }) + ' ' + shiftStartStr;
    }
    return dateTimeShiftStart;
}
function getShiftDifferenceInMinutes(shiftStrStartTime, shiftStrEndTime) {
  let minutes = 0;
  if(shiftStrStartTime && shiftStrEndTime){
      minutes = datefns.differenceInMinutes(datefns.parseISO(shiftStrStartTime),datefns.parseISO(shiftStrEndTime),{roundingMethod:'ceil'});
  }
  return minutes;
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
module.exports.getCurrentShift = getCurrentShift;
module.exports.GetShiftEndAsDateTime = GetShiftEndAsDateTime;
module.exports.getShiftDifferenceInMinutes = getShiftDifferenceInMinutes;
module.exports.getShifTimeTotaltSeconds = getShifTimeTotaltSeconds;
module.exports.getShiftHour = getShiftHour;
module.exports.GetShiftStartAsDateTime = GetShiftStartAsDateTime;
