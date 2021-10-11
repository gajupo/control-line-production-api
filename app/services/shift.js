const { Sequelize, Op, QueryTypes } = require('sequelize');
const { sequelize } = require("../helpers/sequelize");
const models = require("../models");


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

module.exports.getCurrentShift = getCurrentShift;