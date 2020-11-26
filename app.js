'use strict';

const express = require('express');
var bodyParser = require('body-parser');

const { getCustomerList } = require("./app/controllers/customer");
const { getCurrentOrders } = require("./app/controllers/orders");
const { getPaginatedReportList } = require("./app/controllers/reports");
const { getActiveStopCauseLogs, getStopCauseLogsRecord, unblockLine } = require("./app/controllers/stop-cause-log");

const app = express();
const port = 3000;

app.use(bodyParser.json())

app.get('/customers', async (req, res, next) => {
    await getCustomerList(res, next);
});

app.get('/orders', async (req, res, next) => {
    await getCurrentOrders(res, next);
});

app.get('/stopcauselogs', async (req, res, next) => {
    await getActiveStopCauseLogs(res, next);
});

app.get('/stopcauselogs/historical', async (req, res, next) => {
    await getStopCauseLogsRecord(res, next);
});

app.get('/unblock/:stationIdentifier', async (req, res, next) => {
    await unblockLine(req, res, next);
});

app.get('/reportlist/:page', async (req, res, next) => {
    await getPaginatedReportList(req, res, next);
});

app.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
