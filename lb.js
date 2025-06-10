const express = require("express");
const app = express();
const http = require("http");
const port = 3000;

const servers = [
  {
    hostname: "localhost",
    port: 3001,
  },
  {
    hostname: "localhost",
    port: 3002,
  },
  {
    hostname: "localhost",
    port: 3003,
  },
];

let currentServerIdx = 0;
const getNextServer = () => {
  const server = servers[currentServerIdx];
  currentServerIdx += 1;
  currentServerIdx %= servers.length;
  return server;
};

app.use(express.json());

app.get("/", (req, res) => {
  // Log the received request details
  console.log(`Received request from ${req.ip}`);
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  console.log(`Host: ${req.headers.host}`);
  console.log(`User-Agent: ${req.headers["user-agent"]}`);
  console.log(`Accept: ${req.headers.accept}`);

  // redirect the request to backend server
  const server = getNextServer();
  const options = {
    hostname: server.hostname,
    port: server.port,
    path: req.originalUrl,
    method: req.method,
    headers: req.headers,
  };
  delete options.headers.host;

  const proxy = http.request(options, (proxyRes) => {
    // receive its response
    console.log(
      `\nResponse from server: HTTP/${proxyRes.httpVersion} ${proxyRes.statusCode} ${proxyRes.statusMessage}\n`
    );

    // collect the response body
    let bodyData = "";
    proxyRes.on("data", (chunk) => {
      bodyData += chunk;
    });

    proxyRes.on("end", () => {
      // log the response
      console.log(bodyData);

      res.status(proxyRes.statusCode);

      Object.keys(proxyRes.headers).forEach((key) => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      // send the response back
      res.send(bodyData);
    });

    // handle error while receiving the response
    proxyRes.on("error", (err) => {
      console.error("Proxy response error:", err);
      res.status(500).end();
    });

    // might need this part later if no logging
    // of the response body is required
    // proxyRes.pipe(res, { end: true });
  });

  // handle error while sending the request
  proxy.on("error", (err) => {
    console.error("Proxy error: ", err);
    res.status(500).send("Proxy error");
  });

  // forward request body if exist
  if (req.body && Object.keys(req.body).length) {
    proxy.write(JSON.stringify(req.body));
  }

  proxy.end();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
