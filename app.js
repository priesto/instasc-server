'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const fs = require('fs');

const port = process.env.PORT || 8080;

const cors = require('./utils/cors');
const db = require('./utils/database');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(cors);

app.use('/api', require('./routes/users'));
app.use('/api/accounts', require('./utils/verify-jwt'), require('./routes/accounts'));
app.use('/api/posts', require('./utils/verify-jwt'), require('./routes/posts'));

app.listen(port,
    () => console.log(`Api server listening on http://localhost:${port}`)
);