const fs = require('fs');

let test = fs.watch('./testLogs')

test.on('change', (eventType, filename) => {
  console.log(eventType, " | ", filename)
})
