const express = require("express");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  // Log the received request details
  console.log(`Received request from ${req.ip}`);
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  console.log(`Host: ${req.headers.host}`);
  console.log(`User-Agent: ${req.headers['user-agent']}`);
  console.log(`Accept: ${req.headers.accept}`);
  console.log("\nReplied with a hello message");
  res.send("Hello From Backend Server\n");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
