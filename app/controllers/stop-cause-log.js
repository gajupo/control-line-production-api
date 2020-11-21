'use strict';

const { StopCauseLog } = require("../models");

async function getActiveStopCauseLogs(res, next) {
    try {
        const stopCauseLogs = StopCauseLog.findAll({
            where: { status: true }
        });
        res.send(JSON.stringify(stopCauseLogs, null, 2));
    }
    catch(error) {
        next(error);
    }
}

async function getStopCauseLogsRecord(res, next) {
    try {
        const recordCauseLog = StopCauseLog.findAll({
            where: { status: false },
            limit: 10
        });
        res.send(JSON.stringify(recordCauseLog, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getActiveStopCauseLogs = getActiveStopCauseLogs;
module.exports.getStopCauseLogsRecord = getStopCauseLogsRecord;
