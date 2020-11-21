'use strict';

const express = require('express');
const app = express();
const port = 3000;

const { getCustomerList } = require("./app/controllers/customer");
const { getCurrentOrders } = require("./app/controllers/orders");
const { getActiveStopCauseLogs, getStopCauseLogsRecord } = require("./app/controllers/stop-cause-log");

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

app.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
