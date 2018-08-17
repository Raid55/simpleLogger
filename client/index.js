// NOW WITH LESS DEPENDENCIES!!! (meaning none, i understand there are requests libs out there
// but i decided to make the client dependency free for portability, since node runs ok on windows)
const http          = require('http');
const fs            = require('fs');


class Logger {
  constructor(logsPath, clientID, interval, watchFiles, endpoint, echo){
    // init variables
    this.logsPath       = logsPath   || './logs'; // path to all logs
    this.clientID       = clientID   || Math.floor(Math.random() * 1000000000); // client ID 
    this.buffInterval   = interval   || 5555; // interval in bytes that buffer can go to before being sent to server
    this.watchFiles     = watchFiles || ['chrome_debug.log', 'hotkey_manager.log', 'media_uploader.log', 'obs_importer.log'];
    this.echo           = echo       || true; // verbose output

    // folder watcher
    this.watcher        = null; // folder watcher, gets set when .run() runs

    // Logger name -- to differentiate between logger logs and real logs
    this.loggerName     = "simpleLogger"; // name of logger for logger's logs

    // tmp file names
    this.tmpBuff        = `${this.logsPath}/buff.tmp`; // buffers file that need tailing
    this.backlog        = `${this.logsPath}/backlog.tmp`; // all logs that failed getting sent get placed here

    // bytes read -- note: not using arrow function because of a bug with reduce
    this.bytesRead      = this.watchFiles.reduce(function(accu, el) {
      accu[el] = 0;
      return accu;
    }, {});

    // transport options
    if (!endpoint)
      endpoint = {};
  
    this.transport_options = {
      host: endpoint.host || 'localhost',
      port: endpoint.port || '8080',
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
      }
    };
  // binding this to functions that get called from callback
  this.chunkParser    = this.chunkParser.bind(this);
  this.theTransporter = this.theTransporter.bind(this);
  this.errorHandler   = this.errorHandler.bind(this);
  }

  // the main run functions purpose is to keep track of the log folder
  // specified in the init of the class, using fs.watch
  // its an async function that is set to trigger everytime log files change
  // it may not be the best method but it's an alpha version and it makes a 
  // little sense. this function terminates when stop is called, closing the watcher
  async run() {
    const {tmpBuff, chunkParser, logsPath, watchFiles, errorHandler} = this;

    this.watcher = fs.watch(logsPath);
    console.log("Starting Logger...");
    // I know this function gets a bit callback helly but its an alpha
    // after a an hour or two of refactoring im sure it can be cleaner (ex. promisify everything)
    this.watcher
      .on('change', (eventType, filename) => {
        // handling rare edge case as per nodejs docs
        if (!filename)
          filename = "unknown";

        let filePath = `${logsPath}/${filename}`;

        switch(eventType) {
          // event type triggered on a write to a file in folder
          case 'change':
            // checks if the file is included in watchfiles
            if (watchFiles.includes(filename)) {
              // creates a read steam from last byte read onwards
              let tmpStream = fs.createReadStream(filePath, {start: this.bytesRead[filename]});
              // console.log(Buffer.byteLength(logsStr))
              // once data is recived we process it
              tmpStream
                .on('data', chunk => {
                  this.logsArrToFile(chunkParser(filename, chunk), tmpBuff)
                    .then(logStr => {
                      // this line ensures that once the content has been read, every byte goes in the counter
                      // so that next pass around it start right where it left off
                      this.bytesRead[filename] += Buffer.byteLength(chunk);

                      // after getting the size of the current buffer file and based on the set interval
                      // we decide if we want to send the buffer to the server or wait for more logs
                      // this can be changed via interval to the developers choosing, to not make 1000 http
                      // requests a second every time there is a new log line
                      if (this.fileSize(tmpBuff) >= this.buffInterval)
                        this.theTransporter(tmpBuff);
                      // closing the stream
                      tmpStream.close();
                    })
                    .catch(errorHandler);
                })
                .on('error', errorHandler);
            }
            break;

          case 'rename':
            if (/\d/.test(filename) && fs.existsSync(filePath))
              this.theTransporter(filePath);
            break;

          default:
            console.log("Unknown eventType or buff/backlog file");
        }
      })
      .on('error', err => {
        // send to server error log
        errorHandler(err);
        console.log("Logger Offline...");
      })
      .on('close', () => {
        this.flushLogs();
      });
  };

  // chunkParser parses the chunk into lines
  // then splits them, afterwards it parsed it
  // into a uniform format. 
  // FILENAME: name of file for server parsing
  // LINES: raw lines read from log file
  // RETURNS: logsArr, an array of objects that are made for server parsing
  chunkParser(filename, chunk) {
    let tmp;

    // parse if full file path is provided
    if (/\//.test(filename))
      filename = filename.match(/(?<=\/)[^\/]+\.(log|tmp)$/)[0];

    // get the base file name
    filename = filename.split('.')[0];

    // console.log(filename, chunk)
    return chunk.toString().split('\n').map((el) => {
      tmp = this.isJSON(el);
      return tmp ? tmp : {
        logFilename: filename,
        clientID: this.clientID,
        logLine: el
      }
    }).slice(0, -1);
  };


  // gets the size of a file in bytes
  // FILE: location and file name
  fileSize(file) {
    try {
      return fs.statSync(file).size;
    }
    catch(err) {
      this.errorHandler(err);
      return 0;
    }
  };

  // small util function that checks
  // if string can be parsed to json
  // STR: string to check
  // RETURNS: null if it cant or the object parsed
  isJSON(str){
    try {
      let tmp = JSON.parse(str);
      if (tmp && typeof tmp === "object")
        return tmp;
    }
    catch (e) { }

    return null;
};

  // i names this function the transporter based on a movie,
  // i think its funny to think jason statham is doing the http transporting...
  // theTransporters job is now a bit different, it will read the file
  // get it read for json transport, and send it to the server
  // it now only takes file argument, it will call chunkParser
  // FILE: file path to delete it and also for backlog dump
  // RETURNS: null
  theTransporter(filePath) {  
    let request;
    let { 
      transport_options,
      deleteFile,
      backlog,
      readFile,
      logsArrToFile,
      errorHandler 
    } = this;
  
    readFile(filePath)
      // parse the chunks
      .then(chunk => {
        return this.chunkParser(filePath, chunk);
      })
      // stringify to make payload ready
      .then(logArr => {
        return JSON.stringify({
          logs: logArr
        });
      })
      // send payload to server
      .then(payload => {
        // seting the content length, which is mandatory with http request
        transport_options.headers['Content-Length'] = Buffer.byteLength(payload);
        // using http request for no dependencies
        request = http.request(transport_options, res => {
          res.setEncoding('utf8');
          res.on('data', body => {
            // delete file once server responds with 200
            // other wise the server had a problem and we
            // need to backlog them
            console.log("logs sent!");
            if (res.statusCode === 200 && JSON.parse(body).success === true)
              deleteFile(filePath)
                .catch(errorHandler);
            else if (filePath !== backlog)
              logsArrToFile(JSON.parse(payload).logs, backlog)
                .catch(errorHandler);
            else
              errorHandler("Failed to upload backlog file");

            // end http request
            request.end();
          });
        });
        
        // handle request error
        request.on('error', err => {
          // if there is an error then we dump to backlog
          // so we back log them instead of deleting them
          logsArrToFile(JSON.parse(payload).logs, backlog)
            .catch(errorHandler);
          errorHandler(err);
          request.end();
        });

        // send POST request
        request.write(payload);
      })
      .catch(errorHandler);
  };

  // reads the file and returns a promise
  readFile(file) {
    return new Promise((resolve, rejected) => {
      fs.readFile(file, (err, chunk) => {
        if (err)
          rejected(err);
        else
          resolve(chunk);
      })
    })
  }

  // I made this function to because everywhere i
  // delete a file it repeat this code block
  deleteFile(filePath) {
    return new Promise((resolve, rejected) => {
      fs.unlink(filePath, (err) => {
        if (err) 
          rejected(err);
        else
          resolve(filePath);
      });
    });
  }

  // I saw a pattern between dumpsToBacklog and
  // the on change append to buffer, by making thoes
  // two functions into one and help with error handling
  // and code redabilty (hopefully). Now also checks
  // if file is backlog and stops from copying.
  // now dumpToBacklog is merged with this func
  // logsArr: formated log arr
  // RETURN: promise with logsStr appended
  logsArrToFile(logsArr, file) {
    return new Promise((resolve, rejected) => {

      // turns parsed lines back to storage format to be held in buffer or backlog 
      // with extra new line for end of string, since join only put in between
      let logsStr = logsArr.map(el => JSON.stringify(el)).join('\n') + '\n';

      // appends to file passed
      fs.appendFile(file, logsStr, (err) => {
        if (err)
          rejected(err);
        else
          resolve(logsStr);
      });
    })
  }

  // this is a fancy print function
  // that prints if echo is set to true
  // it also formats the error and sends it
  // to the server just as if it where a log
  // logging the logger...
  errorHandler(err) {
    let {tmpBuff, buffInterval, loggerName, echo, clientID} = this;
    // log error if verbose on
    if (echo)
      console.log(err);

    // save error to buff file
    this.logsArrToFile([{
      logFilename: loggerName,
      clientID: clientID,
      err: err
    }], tmpBuff).catch(console.log)

    // check if we can send the buff file
    if (this.fileSize(tmpBuff) >= buffInterval)
      this.theTransporter(tmpBuff);
  }

  // stops the bot once the app closes or whatever
  // calling this ensures that there arent any unsent
  // logs in the buff or backlog, and also closes watcher
  async stop() {
    this.watcher.close();
    // finish sending all logs then send final all done logger log
  };

  // manualy send all buffered logs and back logs to server
  async flushLogs() {
    if (this.fileSize(this.tmpBuff) > 1)
      this.theTransporter(this.tmpBuff);

    if (this.fileSize(this.backlog) > 1)
      this.theTransporter(this.backlog);
  }

};


module.exports = Logger;
