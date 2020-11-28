'use strict';

const Hoek = require('@hapi/hoek');

const {sequelize} = require("../helpers/sequelize");
const { logError, logMessage } = require('../helpers/logger');
const { StopCauseLog, Order, OperatingStation, Shift, StopCause, ProductionLine, Material } = require("../models");
const { notFoundError, successfulOperation } = require("./core");

async function getActiveStopCauseLogs(res, next) {
    try {
        const stopCauseLogs = await StopCauseLog.findAll({
            where: { status: true },
            attributes: ['id', 'status'],
            include: [{
                model: Order,
                required: true,
                attributes: ['orderIdentifier', 'pasPN'],
                include: [{
                    model: Shift,
                    attributes: ['shiftDescription']
                }, {
                    model: Material,
                    foreignKey: 'PasPN',
                    attributes: ['id']
                }]
            }, {
                model: StopCause,
                attributes: ['description']
            }, {
                model: OperatingStation,
                attributes: ['id'],
                include: [{
                    model: ProductionLine,
                    attributes: ['lineName']
                    }]
            }]
        });
        const payload = stopCauseLogs.map(p => p.dataValues);

        logMessage("getActiveStopCauseLogs consumed", payload);
        res.send(JSON.stringify(stopCauseLogs, null, 2));
    }
    catch(error) {
        logError("Error in getActiveStopCauseLogs", error);
        next(error);
    }
}

async function getStopCauseLogsRecord(res, next) {
    try {
        const recordCauseLog = await StopCauseLog.findAll({
            where: { status: false },
            limit: 10,
            attributes: ['id', 'createdDate'],
            include: [{
                model: Order,
                required: true,
                attributes: ['orderIdentifier', 'pasPN'],
                include: [{
                    model: Shift,
                    attributes: ['shiftDescription']
                }]
            }, {
                    model: StopCause,
                    attributes: ['description']
                }]
        });
        const payload = recordCauseLog.map(p => p.dataValues);

        logMessage("getStopCauseLogsRecord consumed", payload);
        res.send(JSON.stringify(recordCauseLog, null, 2));
    }
    catch(error) {
        logError("Error in getStopCauseLogsRecord", error);
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
                logMessage("unblockLine consumed", recordCauseLog.dataValues);
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
        logError("Error in unblockLine", error);
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
