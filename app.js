'use strict';

const express = require('express');
const app = express();
const port = 3000;

const {getCustomerList} = require("./app/controllers/customer");

app.get('/customers', async (req, res, next) => {
    await getCustomerList(res, next);
});

app.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
