require('dotenv').config();

module.exports = {
	LOG_PATH: process.env.SL_LOG_PATH || "./master.log",
  PORT: process.env.SL_PORT || 8080,
  HOST: process.env.SL_HOST || "localhost"
};
