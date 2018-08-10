// NOW WITH LESS DEPENDENCIES!!! (meaning none, i understand there are requests libs out there
// but i decided to make the client dependency free for portability, since node runs ok on windows)
const http = require('http');
const fs = require('fs');

class Logger {
  constructor(logsPath, clientID, interval, watchFiles, endpoint){
    // init variables
    this.logsPath       = logsPath       || './logs'; // path to all logs
    this.clientID       = clientID       || Math.floor(Math.random() * 1000000000); // client ID 
    this.buffInterval   = interval       || 5555; // interval in bytes that buffer can go to before being sent to server

    // folder watcher
    this.watcher        = null; // folder watcher, gets set when .run() runs

    // Logger name -- to differentiate between logger logs and real logs
    this.loggerName     = "simpleLogger"; // name of logger for logger's logs

    // tmp file names
    this.tmpBuff        = `${this.logsPath}/buff.tmp`; // buffers file that need tailing
    this.backlog        = `${this.logsPath}/backlog.tmp`; // all logs that failed getting sent get placed here

    // watchFiles
    this.watchFiles     = watchFiles || ['chrome_debug.log', "hotkey_manager.log", "media_uploader.log", "obs_importer.log"];
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
  this.dumpToBacklog  = this.dumpToBacklog.bind(this);
  this.theTransporter = this.theTransporter.bind(this);
  this.lineParser     = this.lineParser.bind(this);
  }

  // the main run functions purpose is to keep track of the log folder
  // specified in the init of the class, using fs.watch
  // its an async function that is set to trigger everytime log files change
  // it may not be the best method but it's an alpha version and it makes a 
  // little sense. this function terminates when stop is called, closing the watcher
  async run() {
    this.watcher = fs.watch(this.logsPath);
    console.log("Starting Logger...");
    // I know this function gets a bit callback helly but its an alpha
    // after a an hour or two of refactoring im sure it can be cleaner (ex. promisify everything)
    this.watcher
      .on('change', (eventType, filename) => {

        // checks if its a change event and if the file is included in watchfiles
        if (eventType === 'change' && this.watchFiles.includes(filename)) {
          
          // creates a read steam from last byte read onwards
          let tmpStream = fs.createReadStream(`${this.logsPath}/${filename}`, { start: this.bytesRead[filename] });
          
          // once data is recived we process it
          tmpStream
            .on('data', (chunk) => {
              // turn buffer chunks into string
              let chunk2Str = chunk.toString();
              
              // changed this up, now it runs through line parser and then gets
              // reattached as a string to be dumped in the buffer.
              let jsonParsedLines = this.parsedLinesToJSON(this.lineParser(filename, chunk2Str));
              
              // append to buffer file
              fs.appendFile(this.tmpBuff, jsonParsedLines, (err) => {
                // errors are handled not to crash program but they dont log themselves...yet
                if (err)
                  console.log(err);
                else
                  // this line ensures that once the content has been read, every byte goes in the counter
                  // so that next pass around it start right where it left off
                  this.bytesRead[filename] += Buffer.byteLength(chunk2Str);

                // after getting the size of the current buffer file and based on the set interval
                // we decide if we want to send the buffer to the server or wait for more logs
                // this can be changed via interval to the developers choosing, to not make 1000 http
                // requests a second every time there is a new log line
                if (this.getFilesizeInBytes(this.tmpBuff) >= this.buffInterval)
                  this.theTransporter(this.tmpBuff, this.bbToArr(this.tmpBuff));
              });
              // closing the stream
              tmpStream.close();
            });
          
        }
        else if (eventType === 'rename' && /\d{8}-\d{6}.log$/.test(filename) && fs.existsSync(`${this.logsPath}/${filename}`)) {
          try {
            let filePath = `${this.logsPath}/${filename}`;
            let data = fs.readFileSync(filePath);
            this.theTransporter(filePath, this.lineParser(filename, data.toString()));
          }
          catch(err) {
            console.log(err);
          }
        }
        else {
          console.log("Unknown eventType or buff/backlog file");
        }
      })
      .on('error', (err) => {
        // send to server error log
        console.log(err);
        console.log("Logger Offline...");
      })
      .on('close', () => {
        if (this.getFilesizeInBytes(this.tmpBuff) > 1)
          this.theTransporter(this.tmpBuff, this.bbToArr(this.tmpBuff));
        if (this.getFilesizeInBytes(this.backlog) > 1)
          this.theTransporter(this.backlog, this.bbToArr(this.backlog));
      });
  };

  // lineParser parses the raw lines, they havent been split yet
  // it also parses it into the server format
  // FILENAME: name of file for server parsing
  // LINES: raw lines read from log file
  // RETURNS: an array of objects that are made for server parsing
  lineParser(filename, lines) {
    return lines.split('\n').map((el) => {
      return {
        logFilename: filename.split('.')[0],
        clientID: this.clientID,
        logLine: el
      }
    });
  };

  // turns parsed lines back to storage format
  // to be held in buffer or backlog
  // extra new line for end of string, since join only put in between
  // LOG_ARR: formated log arr
  // RETURN: string that can be stored
  parsedLinesToJSON(log_arr) {
    return log_arr.map(el => JSON.stringify(el)).join('\n') + '\n';
  };

  // gets the size of a file in bytes
  // FILE: location and file name
  getFilesizeInBytes(file) {
    try {
      return fs.statSync(file).size;
    }
    catch(err) {
      console.log(err);
      return 0;
    }
  };

  // turns buff or backlog file into compliant arr for theTransporter
  // this function is called bbToPayload because it
  // handles both buffer and backlog to log arr
  // FILE: location and file name
  bbToArr(file) {
    try {
      let data = fs.readFileSync(file);
      return data.toString().split('\n').map(el => {
        try {
          return JSON.parse(el);
        }
        catch(err) {
          return null;
        }
      }).filter(el => el);
    }
    catch(err) {
      console.log(err);
      return null;
    }
  };

  // i names this function the transporter based on a movie,
  // i think its funny to think jason statham is doing the http transporting...
  // theTransporters job is now a bit different, since http.request is async
  // i use the events to handle the deleting of the files, and dumping to backlog
  // this now does what sendLog did, and its all async
  // FILE: file path to delete it and also for backlog dump
  // LOG_ARR: array of formated logs to send
  // RETURNS: null
  theTransporter(file, log_arr) {  
    let payload;
    let { dumpToBacklog, transport_options } = this;
  
    if (!log_arr || log_arr.length < 1)
      return;
  
    try {
      payload = JSON.stringify({
        logs: log_arr
      });
    }
    catch(err) {
      console.log(err);
      return;
    }
    // seting the content length, which is mandatory with http request
    transport_options.headers['Content-Length'] = Buffer.byteLength(payload);
    // using http request for no dependencies
    let request = http.request(transport_options, (res) => {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        // delete file once server responds with 200
        // other wise the server had a problem and we
        // need to backlog them
        console.log("logs sent!");
        if (res.statusCode === 200 && JSON.parse(chunk).success === true)
          fs.unlink(file, (err) => {
            if (err) 
              console.log(err);
            else
              console.log(`${file}: deleted`);
          });
        else
          dumpToBacklog(file, log_arr);

        // end http request
        request.end();
      });
    });
  
    request.write(payload);
  
    request.on('error', (err) => {
      // if there is an error then we dump to backlog
      // so we back log them instead of deleting them
      dumpToBacklog(file, log_arr);
      console.log(err);
      request.end();
    });
  };


  // dumps file or buffer to backlog if failed to send to server
  // this is a safty so that we dont lose any logs since
  // we are deleting the files after trying to send them
  // this file never gets deleted and will only
  // FILE: to compare and see if its backlog file
  // LOG_ARR: array of log parsed log lines
  dumpToBacklog(file, log_arr) {
    let { backlog } = this;

    if (file === backlog)
      return;
  
    let jsonParsedLines = this.parsedLinesToJSON(log_arr);
    fs.appendFile(backlog, jsonParsedLines, (err) => {
      if (err)
        console.log(err);
      else {
        console.log("back logged...");
        fs.unlink(file, (err) => {
          if (err) 
            console.log(err) 
          else
            console.log(`${file}: deleted`);
        });
      }
    });
  
  };

  // stops the bot once the app closes or whatever
  // calling this ensures that there arent any unsent
  // logs in the buff or backlog, and also closes watcher
  async stop() {
    this.watcher.close();
    // finish sending all logs then send final all done logger log
  };

};


module.exports = Logger;
