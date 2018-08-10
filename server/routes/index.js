// env vars
const { LOG_PATH } = require('../config');

const express = require('express');
const router  = express.Router();
const parser  = require("../utils/parsers");
const fs      = require('fs');

// Status to check endpoint
router.get('/status', (req, res) => {
	res.status(200).send({ message: "all is fine in the neighborhood...", code: 200 });
});

// main post endpoint to send all logs to
router.post('/', (req, res) => {
  if (req.body.logs && typeof req.body.logs === 'object') {

    fs.appendFile(LOG_PATH, parser(req.body.logs), (err) => {
      if (err) {
        console.log(err);
        res.status(400).send({success: false});
      }
      else
        res.status(200).send({success: true});
    });
  }
  else {
    res.status(400).send({success: false});
  }
});

module.exports = router;
