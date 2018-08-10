// include all parser types and their respective file names to expect

const parsers = {
  "obs_importer": require('./obs_importer.js'),
  "media_uploader": require('./media_uploader.js'),
  "hotkey_manager": require('./hotkey_manager.js'),
  "bebo-capture": require('./bebo-capture.js'),
  "gst-to-dshow": require('./gst-to-dshow.js'),
  "default": require('./default.js')
}


function logParser(log_arr) {
  return log_arr.map(el => {
    return JSON.stringify({
      logFilename: el.logFilename,
      clientID: el.clientID,
      unparsedData: el.logLine,
      parsedData: {
        ...parsers[Object.keys(parsers).includes(el.logFilename) ? el.logFilename : "default"](el.logLine)
      }
    })
  }).join('\n');
}

module.exports = logParser;
