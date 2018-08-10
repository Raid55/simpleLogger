// importing modules
const bodyParser = require('body-parser');
const express    = require('express');
const morgan     = require('morgan');
const chalk      = require('chalk');

// init app
const app = express();

// init http server
const httpServer = require('http').createServer(app);

// body parser
app.use(bodyParser.json());

// Morgan logger //
app.use(morgan(chalk.grey('........................................')));
app.use(morgan(chalk.blue(':user-agent')));
app.use(morgan(chalk.red.bold('[:date[clf]]')));
app.use(morgan(chalk.yellow.bold('":method | :url | HTTP/:http-version"')));
app.use(morgan(chalk.cyan(':status | :res[content-length] | :response-time ms')));
app.use(morgan(chalk.grey('........................................')));
app.use(morgan(' '));
// end of logger info //

// importing routes
const routes = require('./routes');

// applying routes
app.use('/', routes);

module.exports = httpServer;
