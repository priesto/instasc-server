'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const fs = require('fs');

const port = process.env.PORT || 8080;

const cors = require('./utils/cors');
const db = require('./utils/database');

const app = express();

app.use(logger.Error);
app.use(logger.Info);

app.use(bodyParser.json());
app.use(cors);

app.use('/api', require('./routes/users'));
app.use('/api/accounts', require('./utils/verify-jwt'), require('./routes/accounts'));
app.use('/api/posts', require('./utils/verify-jwt'), require('./routes/posts'));

app.use((err, req, res, next) => {
    req.message = err.message;

    // Print more information
    console.log('fields: ', err.fields);
    console.log('err: ', err.err);

    res.status(err.status).send();
})

app.listen(port,
    () => console.log(`Api server listening on http://localhost:${port}`)
);