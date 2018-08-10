const querystring = require('querystring');
const http = require('http');
const fs = require('fs');

class Logger {
  constructor(endpoint, logsPath, clientID, interval, watchFiles){
    // init variables
    this.logsPath       = logsPath       || './logs';
    this.clientId       = clientID       || Math.floor(Math.random() * 1000000000);
    this.endpoint       = endpoint       || 'localhost:8080';
    this.buffInterval   = interval       || 10

    // folder watcher
    this.watcher        = null;

    // tmp file names
    this.tmpBuff        = `${this.logsPath}/buff.tmp`;
    this.backlog        = `${this.logsPath}/backlog.tmp`;

    // watchFiles
    this.watchFiles     = watchFiles || ['chrome_debug.log', "hotkey_manager.log", "media_uploader.log", "obs_importer.log"];
    // bytes read -- note: not using arrow function because of a bug with reduce
    this.bytesRead      = watchFiles.reduce(function(accu, el) {
      accu[el] = 0;
      return accu;
    }, {});

    // transport options
    // this.transport_options = {

    // };
  }

  // the main run functions purpose is to keep track of the log folder
  // specified in the init of the class, using fs.watch
  // its an async function that is set to trigger everytime log files change
  // it may not be the best method but it's an alpha version and it makes a 
  // little sense. this function terminates when stop is called, closing the watcher
  async run() {
    this.watcher = fs.watch(this.logsPath);

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
              
              // await append to buffer file
              await fs.appendFile(this.tmpBuff, chunk2Str, (err) => {
                // errors are handled not to crash program but they dont log themselves...yet
                if (err)
                  console.log(err)
                else
                  // this line ensures that once the content has been read, every byte goes in the counter
                  // so that next pass around it start right where it left off
                  this.bytesRead[filename] += Buffer.byteLength(chunk2Str);
              });

              // after getting the size of the current buffer file and based on the set interval
              // we decide if we want to send the buffer to the server or wait for more logs
              // this can be changed via interval to the developers choosing, to not make 1000 http
              // requests a second every time there is a new log line
              if (getFilesizeInBytes(this.tmpBuff) >= this.buffInterval)
                sendLogs(this.tmpBuff)

              // closing the stream
              tmpStream.close();
            });
          
        }
        else if (eventType === 'rename') {

        }
        else {
          console.log("Unknown eventType");
        }
      })
      .on('error', (err) => {
        // send to server error log
      })
      .on('close', () => {
        // finish sending all logs from dump to server
      })
  }

  // gets the size of a file in bytes
  // FILE: location and file name
  getFilesizeInBytes(file) {
    return fs.statSync(file).size
  }

  // dumps file or buffer to backlog if failed to send to server
  // this is a safty so that we dont lose any logs since
  // we are deleting the files after trying to send them
  // this file never gets deleted and will only 
  // FILE: location and file name
  dumpToBacklog(file) {
    let backlogStream = fs.createWriteStream(this.backlog, {flags: 'a'});
    let fileStream = fs.createReadStream(file);

    fileStream.pipe(backlogStream);

    backlogStream.close();
    fileStream.close();
  }

  // handles the sending of a file to the server
  // calles multiple functions in order to do it
  // handles the backlog file logic as well
  // FILE: location and file name
  sendLogs(file) {
    const status = this.theTransporter(this.fileToPayload(file));
  
    // if status returns false that means the server did not
    // get the logs, so we back log them instead of deleting them
    if (!status && file !== this.backlog)
      this.dumpToBacklog(file);
    
    // regular files get deleted no matter what
    // but we only want to delete backlog if it has
    // been uploaded successfuly
    if (status || file !== this.backlog)
      fs.unlink(file, (err) => {
        if (err) console.log(err) else console.log(`${file}: deleted`);
      });
  }

  // turns a file into a json string payload ready
  // FILE: location and file name
  fileToPayload(file) {

  }

  // i names this function the transporter based on a movie,
  // i think its funny to think jason statham is doing the http transporting...
  // theTransporters job is to take a json payload and send it to 
  // the server using the endpoint provided in the init
  // PAYLOAD: JSON string to send to server
  // RETURNS: true or false depending on success
  theTransporter(payload) {

  }

  async stop() {
    this.watcher.close()
    // finish sending all logs then send final all done logger log
  }

}

module.exports = Logger

