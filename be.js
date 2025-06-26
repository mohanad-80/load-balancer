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

  const start = Date.now();
  // Simulate long processing
  setTimeout(() => {
    res.send(`Hello From Backend Server ${port}\n`);
    const duration = Date.now() - start;
    console.log(`Processed request in ${duration} ms`);
  }, 10_000);
});

app.get("/health", (req, res) => {
  res.status(200).end();
  console.log("health checked and returning success");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
