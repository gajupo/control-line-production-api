'use strict';

const express = require('express');
const app = express();
const port = 3000;

const { getCustomerList } = require("./app/controllers/customer");
const { getCurrentOrders } = require("./app/controllers/orders");

app.get('/customers', async (req, res, next) => {
    await getCustomerList(res, next);
});

app.get('/orders', async (req, res, next) => {
    await getCurrentOrders(res, next);
});

app.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
