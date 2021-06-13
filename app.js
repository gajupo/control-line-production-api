'use strict';

const express = require('express');
const cors = require('cors');

const { getCustomerList } = require("./app/controllers/customer");
const { getCurrentOrders, createNewOrder, getCustomerOrders,
    scanOrderProduct, closeOrder } = require("./app/controllers/orders");
const { getPaginatedReportList } = require("./app/controllers/reports");
const { getActiveStopCauseLogs, getStopCauseLogsRecord, unblockLine, 
    getActiveStopCauseLogsByCustomer, getStopCauseLogsRecordByCustomer }= require("./app/controllers/stop-cause-log");
const { getMaterialList, getMaterialListPerCustomer } = require("./app/controllers/materials");
const { getProductionLines, getProductionLinesPerCustomer } = require("./app/controllers/production-lines");
const { getShiftsPerProductionLine } = require("./app/controllers/shifts");

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 3001;

app.use(cors());

/**
 * GET /customers
 */
app.get('/customers', async (req, res, next) => {
    await getCustomerList(res, next);
});

/**
 * GET /orders
 */
app.get('/orders', async (req, res, next) => {
    await getCurrentOrders(res, next);
});

/**
 * PUT /order/scan/15
 */
app.put('/order/scan/:orderId', async (req, res) => {
    await scanOrderProduct(req, res, io);
});

/**
 * PUT /order/close/22
 */
 app.put('/order/close/:orderId', async (req, res) => {
    await closeOrder(req, res, io);
});

/**
 * GET /customers/id
 */
app.get('/orders/:id', async (req, res) => {
    await getCustomerOrders(req, res);
});

/**
 * GET /stopcauselogs
 */
app.get('/stopcauselogs', async (req, res, next) => {
    await getActiveStopCauseLogs(res, next);
});

/**
 * GET /stopcauselogs/6
 */
app.get('/stopcauselogs/:customerId', async (req, res) => {
    await getActiveStopCauseLogsByCustomer(req, res);
});

/**
 * GET /stopcauselogs/historical
 */
app.get('/stopcauselogs/historical', async (req, res, next) => {
    await getStopCauseLogsRecord(res, next);
});

/**
 * GET /stopcauselogs/historical/6
 */
app.get('/stopcauselogs/historical/:customerId', async (req, res) => {
    await getStopCauseLogsRecordByCustomer(req, res);
});

/**
 * PUT /unblock/STATION01
 */
app.put('/unblock/:stationIdentifier', async (req, res) => {
    await unblockLine(req, res, io);
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
app.post('/reportlist/:page', async (req, res, next) => {
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
    await createNewOrder(req, res, io);
});

/**
 * GET /materials
 */
app.get('/materials', async (req, res, next) => {
    await getMaterialList(res);
});

/**
 * GET /materials/client/6
 */
app.get('/materials/client/:id', async (req, res, next) => {
    await getMaterialListPerCustomer(req, res);
});

/**
 * GET /productionlines
 */
app.get('/productionlines', async(req, res, next) => {
    await getProductionLines(res);
});

/**
 * GET /shifts/line/2
 */
app.get('/shifts/line/:productionLineId', async(req, res, next) => {
    await getShiftsPerProductionLine(req, res);
});

/**
 * GET /productionlines/customer/15
 */
app.get('/productionlines/customer/:customerId', async(req, res) => {
    await getProductionLinesPerCustomer(req, res);
});

io.on('connection', (socket) => {
    console.log('User connected...');
});

http.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
