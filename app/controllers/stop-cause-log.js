'use strict';

const { StopCauseLog, User, Order, OperatingStation, Shift } = require("../models");

async function getActiveStopCauseLogs(res, next) {
    try {
        const stopCauseLogs = await StopCauseLog.findAll({
            where: { Status: true }
        });
        res.send(JSON.stringify(stopCauseLogs, null, 2));
    }
    catch(error) {
        next(error);
    }
}

async function getStopCauseLogsRecord(res, next) {
    try {
        const recordCauseLog = await StopCauseLog.findAll({
            where: { status: false },
            limit: 10,
            include: [{
                model: User,
                as: 'User'
            }, {
                model: User,
                as: 'Resolver'
            }, {
                model: Order,
                include: [{
                    model: Shift
                }]
            }, {
                model: OperatingStation
            }]
        });
        res.send(JSON.stringify(recordCauseLog, null, 2));
    }
    catch(error) {
        next(error);
    }
}

async function unblockLine(req, res, next) {
    try {
        const stationIdentifier = req.params.stationIdentifier;
        const stoppedLine = await StopCauseLog.findAll({
            include: {
                model: OperatingStation,
                where: { stationIdentifier: stationIdentifier }
            },
            where: { status: true }
        });
        res.send(JSON.stringify(stoppedLine, null, 2));
    }
    catch(error) {
        next(error);
    }
}

module.exports.getActiveStopCauseLogs = getActiveStopCauseLogs;
module.exports.getStopCauseLogsRecord = getStopCauseLogsRecord;
module.exports.unblockLine = unblockLine;
