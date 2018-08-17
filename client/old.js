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
          this.theTransporter(this.tmpBuff, this.bbToLogArr(this.tmpBuff));
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
