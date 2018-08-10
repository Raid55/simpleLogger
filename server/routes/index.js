const express = require('express');
const router = express.Router();

// Status to check endpoint
router.get('/status', (req, res) => {
	res.status(200).send({ message: "all is fine in the neighborhood...", code: 200 });
});

// main post endpoint to send all logs to
router.post('/', (req, res) => {
  console.log(req.body);
  res.status(200).send({success: true});
});

module.exports = router;
