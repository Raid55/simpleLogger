const querystring = require('querystring');
const http = require('http');
const fs = require('fs');

var post_data = JSON.stringify([
    {filename: "tonny's ballad", data: "lots of data stuff that needs to be processed, aka the entire line"},
    {filename: "tonny's ballad 2", data: "the return"}
  ]);

console.log(post_data)

// An object of options to indicate where to post to
var post_options = {
  host: 'localhost',
  port: '8080',
  path: '/',
  method: 'POST',
  headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(post_data)
  }
};

// Set up the request
http.request(post_options, function(res) {
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
      console.log('Response: ' + chunk);
      res.destroy();
  });
  res.on('error', (err) => {
    console.log(err)
  })
}).write(post_data)

// post the data
// post_req.write(post_data);
// post_req.end();
// post_req.write(post_data);
