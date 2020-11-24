'use strict';

const Hoek = require('@hapi/hoek');
const {sequelize} = require("../helpers/sequelize");
const { StopCauseLog, User, Order, OperatingStation, Shift } = require("../models");
const { notFoundError, successfulOperation } = require("./core");

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
        const stationIdentifier = Hoek.escapeHtml(req.params.stationIdentifier);
        const stoppedLine = await StopCauseLog.findOne({
            include: {
                model: OperatingStation,
                where: { stationIdentifier: stationIdentifier }
            },
            where: { status: true }
        });
        if (stoppedLine) {
            var actualizados = await updateStoppedLine(stoppedLine.id);
            if (actualizados) {
                successfulOperation(`The operating station ${stationIdentifier} was unblocked succesfully`, res);
            }
            else {
                internalServerError(`There was an error unblocking the operating station ${stationIdentifier}`, res);
            }
        }
        else{
            notFoundError(`A blocked operating station with the identifier ${stationIdentifier} was not found`, res);
        }
    }
    catch(error) {
        next(error);
    }
}

async function updateStoppedLine(stopCauseLogId) {

    var actualizados = await StopCauseLog.update({ 
        status: false,
        // TODO: Find a better way to do this.
        solutionDate: sequelize.literal('CURRENT_TIMESTAMP')
     }, {
        where: { id: stopCauseLogId }
    });
    return actualizados;
}

module.exports.getActiveStopCauseLogs = getActiveStopCauseLogs;
module.exports.getStopCauseLogsRecord = getStopCauseLogsRecord;
module.exports.unblockLine = unblockLine;
