const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

let requestsCounter = 0;

app.get("/", (req, res) => {
  // Log the received request details
  console.log(`Received request from ${req.ip}`);
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  console.log(`Host: ${req.headers.host}`);
  console.log(`User-Agent: ${req.headers["user-agent"]}`);
  console.log(`Accept: ${req.headers.accept}`);
  console.log("\nReplied with a hello message");
  requestsCounter += 1;
  console.log(requestsCounter);
  res.send(`Hello From Backend Server ${port}\n`);
});

app.get("/health", (req, res) => {
  console.log("health checked and returning success");
  res.status(200).end();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
