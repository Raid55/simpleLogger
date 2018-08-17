const fs = require('fs')
setInterval(() => {
  fs.appendFile('../testLogs/shesamaniac', 'data to append'+Math.floor(Math.random() * 1000000)+'\n', function (err) {
    if (err) throw err;
    console.log('Saved!');
  });
}, 500)
