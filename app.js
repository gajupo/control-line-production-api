'use strict';

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('SIMPL Dashboard API');
});

app.listen(port, () => {
    console.log(`SIMPL Dashboard API listening at http://localhost:${port}`);
})
