// env vars
const { PORT, HOST } = require('./config');

// I like colors in my terminal #priorities
const chalk = require('chalk');

// Importing server
const httpServer = require('./app.js');

httpServer.listen(PORT);
httpServer
	.on('listening', () => {
    console.log(chalk.grey.bold('\n...'));
    console.log(chalk.blue(`Starting logger at ${HOST}:${PORT}...`));
    console.log(chalk.magenta.bold(`Running`));
    console.log(chalk.grey.bold('...\n'));
	})
	.on('error', err => {
		console.log(chalk.bold.bgRed.white("***ERROR***")); /* eslint-disable-line babel/quotes */ // stings "" keys ''
		throw err;
	});

// close function
function stop () {
	httpServer.close();
	return true;
}

process.on('SIGINT', () => {
	console.log("== Terminating App ==");
	if (stop()) process.exit();
});
