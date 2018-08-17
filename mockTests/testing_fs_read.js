const fs = require('fs');

fs.unlink("./dawg", (err) => {
  if (err) 
    console.log(err);
  else
    console.log(`${file}: deleted`);
});
