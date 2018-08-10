const querystring = require('querystring');
const http = require('http');
const fs = require('fs');

class Logger {
  constructor(endpoint, logsPath, clientID, interval/*, watchFiles*/){
    // init variables
    this.logsPath       = logsPath       || './logs';
    this.clientId       = clientID       || Math.floor(Math.random() * 1000000000);
    this.endpoint       = endpoint       || 'localhost:8080';
    this.interval       = interval       || 10
    // this.watchFiles ? maybe I could add an array of files that need to be constantly tailed

    // folder watcher
    this.watcher        = null;

    // transport options
    this.transport_options = 
  }

  async run() {
    // start watcher and handle events
  }

  async stop() {
    this.watcher.close()
    // finish sending all logs then send final all done logger log
  }

  // will send logs in a predefined format to server
  logTransporter(payload) {
    // let post_data = querystring.stringify({
    //   compilation_level: 'ADVANCED_OPTIMIZATIONS',
    //   output_format: 'json',
    //   output_info: 'compiled_code',
    //   warning_level: 'QUIET',
    //   js_code: payload
    // });

  }

}

module.exports = Logger

