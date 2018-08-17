const fs = require('fs');

let test = fs.watch('../testLogs')
let count = 0
test.on('change', (eventType, filename) => {
  console.log(eventType, " | ", filename)
  let tmpString = fs.createReadStream(`../testLogs/${filename}`, { start: count });
  tmpString.on('data', data => {
    console.log(data.toString())
    count += Buffer.byteLength(data.toString())
    console.log(data.toString().split('\n'));
    tmpString.close()
  })

  console.log(count)
})

// setInterval(() => {
//   fs.appendFile('../testLogs/shesamaniac', 'data to append'+Math.floor(Math.random() * 1000000)+'\n', function (err) {
//     if (err) throw err;
//     console.log('Saved!');
//   });
// }, 100)
