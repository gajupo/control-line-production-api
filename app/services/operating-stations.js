const { QueryTypes } = require('sequelize');
const { sequelize } = require('../helpers/sequelize');
const { logger } = require('../helpers/logger');

async function getStopStationStatuses(stationIds) {
  try {
    const stationStatused = await sequelize.query(
      `SELECT top 1
        id as [StopCauseLogId],
        status as [blocked],
        StationId 
      FROM StopCauseLogs 
      WHERE StationId IN(:stationIds) AND status = 1
      ORDER BY id desc`,
      {
        replacements: { stationIds: stationIds },
        raw: true,
        type: QueryTypes.SELECT,
      }
    );
    return stationStatused;
  } catch (error) {
    logger.info('Erro on getting stop station statuses', error);
    throw new Error(error);
  }
}
module.exports.getStopStationStatuses = getStopStationStatuses;
