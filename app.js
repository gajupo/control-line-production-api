'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const { getCustomerList } = require("./app/controllers/customer");
const { getCurrentOrders, createNewOrder, getCustomerOrders } = require("./app/controllers/orders");
const { getPaginatedReportList } = require("./app/controllers/reports");
const { getActiveStopCauseLogs, getStopCauseLogsRecord, unblockLine } = require("./app/controllers/stop-cause-log");

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

/**
 * GET /customers
 */
app.get('/customers', async (req, res, next) => {
    await getCustomerList(res, next);
});

/**
 * GET /customers/id
 */
app.get('/customers/:id', async (req, res) => {
    await getCustomerOrders(req, res);
});

/**
 * GET /orders
 */
app.get('/orders', async (req, res, next) => {
    await getCurrentOrders(res, next);
});

/**
 * GET /stopcauselogs
 */
app.get('/stopcauselogs', async (req, res, next) => {
    await getActiveStopCauseLogs(res, next);
});

/**
 * GET /stopcauselogs/historical
 */
app.get('/stopcauselogs/historical', async (req, res, next) => {
    await getStopCauseLogsRecord(res, next);
});

/**
 * PUT /unblock/STATION01
 */
app.put('/unblock/:stationIdentifier', async (req, res, next) => {
    await unblockLine(req, res, next);
});

/**
 * GET /reportlist/1
 * 
 * {
 *     "pasPN": "290D2851G001",
 *     "scanDate": 
 *     {
 *         "from": "2020-11-27T14:34:41.157Z",
 *         "to": "2020-11-27T20:37:48.330Z"
 *     }
 * }
 */
app.get('/reportlist/:page', async (req, res, next) => {
    await getPaginatedReportList(req, res, next);
});

/**
 * POST /orders/new
 * 
 * {
 *      "productionLineId": 1,
 *      "materialId": 5
 * }
 */
app.post('/orders/new', async (req, res, next) => {
    await createNewOrder(req, res);
});

app.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
