'use strict';

const { StopCauseLog } = require("../models");

async function getActiveStopCauseLogs(res, next) {
    try {
        const stopCauseLogs = StopCauseLog.findAll({
            where: { status: true }
        });
        res.send(stopCauseLogs.toJSON());
    }
    catch(error) {
        next(error);
    }
}

async function getStopCauseLogsRecord(res, next) {
    try {
        const historicCauseLog = StopCauseLog.findAll({
            where: { status: false },
            limit: 10
        });
    }
    catch(error) {
        next(error);
    }
}

module.exports.getActiveStopCauseLogs = getActiveStopCauseLogs;
module.exports.getStopCauseLogsRecord = getStopCauseLogsRecord;
