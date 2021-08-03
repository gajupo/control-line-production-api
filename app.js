'use strict';

const express = require('express');
const cors = require('cors');

const { getCustomerList } = require("./app/controllers/customer");
const { getCurrentOrders, createNewOrder, getCustomerOrders,
    scanOrderProduct, closeOrder } = require("./app/controllers/orders");
const { getPaginatedReportList } = require("./app/controllers/reports");
const { getActiveStopCauseLogs, getStopCauseLogsRecord, unblockLine, 
    getActiveStopCauseLogsByCustomer, getStopCauseLogsRecordByCustomer } = require("./app/controllers/stop-cause-log");
const { getMaterialList, getMaterialListPerCustomer } = require("./app/controllers/materials");
const { getProductionLines, getProductionLinesPerCustomerCurrentShift, 
    getProductionLinesPerCustomer } = require("./app/controllers/production-lines");
const { getShiftsPerProductionLine } = require("./app/controllers/shifts");
const { getProductionLines: ldGetProductionLines,  
    getProductionLine: ldGetProductionLine, 
    getProductionCompliance: ldGetProductionCompliance } = require("./app/controllers/line-dashboard");
const { getValidationResultsPerHour, getProductionRatePerHour } = require("./app/controllers/validation-results");


const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

app.use(express.json());
app.use(cors());

/**
 * GET /api/customers
 */
app.get('/api/customers', async (req, res, next) => {
    await getCustomerList(res, next);
});

/**
 * GET /api/orders
 */
app.get('/api/orders', async (req, res, next) => {
    await getCurrentOrders(res, next);
});

/**
 * PUT /api/order/scan/15
 */
app.put('/api/order/scan/:orderId', async (req, res) => {
    await scanOrderProduct(req, res, io);
});

/**
 * PUT /api/order/close/22
 */
 app.put('/api/order/close/:orderId', async (req, res) => {
    await closeOrder(req, res, io);
});

/**
 * GET /api/customers/id
 */
app.get('/api/orders/:id', async (req, res) => {
    await getCustomerOrders(req, res);
});

/**
 * GET /api/stopcauselogs
 */
app.get('/api/stopcauselogs', async (req, res, next) => {
    await getActiveStopCauseLogs(res, next);
});

/**
 * GET /api/stopcauselogs/6
 */
app.get('/api/stopcauselogs/:customerId', async (req, res) => {
    await getActiveStopCauseLogsByCustomer(req, res);
});

/**
 * GET /api/stopcauselogs/historical
 */
app.get('/api/stopcauselogs/historical', async (req, res, next) => {
    await getStopCauseLogsRecord(res, next);
});

/**
 * GET /api/stopcauselogs/historical/6
 */
app.get('/api/stopcauselogs/historical/:customerId', async (req, res) => {
    await getStopCauseLogsRecordByCustomer(req, res);
});

/**
 * PUT /api/unblock/STATION01
 */
app.put('/api/unblock/:stationIdentifier', async (req, res) => {
    await unblockLine(req, res, io);
});

/**
 * POST /api/reportlist/1
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
app.post('/api/reportlist/:page', async (req, res, next) => {
    await getPaginatedReportList(req, res, next);
});

/**
 * POST /api/orders/new
 * 
 * {
 *      "productionLineId": 1,
 *      "materialId": 5
 * }
 */
app.post('/api/orders/new', async (req, res, next) => {
    await createNewOrder(req, res, io);
});

/**
 * GET /api/materials
 */
app.get('/api/materials', async (req, res, next) => {
    await getMaterialList(res);
});

/**
 * GET /api/materials/client/6
 */
app.get('/api/materials/client/:id', async (req, res, next) => {
    await getMaterialListPerCustomer(req, res);
});

/**
 * GET /api/productionlines
 */
app.get('/api/productionlines', async(req, res, next) => {
    await getProductionLines(res);
});

/**
 * GET /api/shifts/productionline/2
 */
app.get('/api/shifts/productionline/:productionLineId', async(req, res) => {
    await getShiftsPerProductionLine(req, res);
});

/**
 * GET /api/productionlines/shift/customer/15
 */
app.get('/api/productionlines/shift/customer/:customerId', async(req, res) => {
    await getProductionLinesPerCustomerCurrentShift(req, res);
});

/**
 * GET /api/productionlines/customer/15
 */
 app.get('/api/productionlines/customer/:customerId', async(req, res) => {
    await getProductionLinesPerCustomer(req, res);
});

/**
 * POST /api/validationresults/perhour/
 * 
 * {
 *      "customerId": 1,
 *      "shiftId": 1,
 *      "productionLineId": 1,
 *      "date": "2021-07-20T14:34:41.157Z"
 * }
 */
app.post('/api/validationresults/perhour', async(req, res) => {
    await getValidationResultsPerHour(req, res);
});

/**
 * POST /api/productionrates/perhour/
 * 
 * {
 *      "customerId": 1,
 *      "shiftId": 1,
 *      "productionLineId": 1,
 *      "date": "2021-07-20T14:34:41.157Z"
 * }
 */
 app.post('/api/productionrates/perhour', async(req, res) => {
    await getProductionRatePerHour(req, res);
});

/**
 * GET /api/line-dashboard/productionlines/customer/6
 */
 app.get('/api/line-dashboard/productionlines/customer/:customerId', async(req, res) => {
    await ldGetProductionLines(req, res);
});

/**
 * GET /api/line-dashboard/productionline/1
 */
 app.get('/api/line-dashboard/productionline/:lineId', async(req, res) => {
    await ldGetProductionLine(req, res);
});

/**
 * GET /api/line-dashboard/productioncompliance/1
 */
 app.get('/api/line-dashboard/productioncompliance/:lineId', async(req, res) => {
    await ldGetProductionCompliance(req, res);
});

io.on('connection', (_) => {
    console.log('User connected...');
});

http.listen(PORT, HOST, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${PORT}`);
})
