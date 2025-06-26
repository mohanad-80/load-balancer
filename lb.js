const express = require("express");
const app = express();
const http = require("http");

// custom agent with keepAlive and a custom timeout
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 45_000, // 45 seconds
  maxSockets: 50, // allows 50 parallel connections PER backend. default is infinity but this might exhaust the backend resources.
});

const port = 3000;

const servers = [
  {
    hostname: "localhost",
    port: 3001,
    healthy: true,
  },
  {
    hostname: "localhost",
    port: 3002,
    healthy: true,
  },
  {
    hostname: "localhost",
    port: 3003,
    healthy: true,
  },
];

let currentServerIdx = 0;
const MAX_RETRIES = servers.length * 2;

const getNextServer = () => {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    const server = servers[currentServerIdx];
    currentServerIdx = (currentServerIdx + 1) % servers.length;
    attempts++;
    if (server.healthy) return server;
  }
  return null; // All servers appear unhealthy
};

const checkServerHealth = (server) => {
  return new Promise((resolve) => {
    const options = {
      hostname: server.hostname,
      port: server.port,
      path: "/health",
      method: "get",
      timeout: 2000,
    };

    const healthRequest = http.request(options, (healthRes) => {
      healthRes.resume();
      healthRes.on("end", () => {
        const prevHealthState = server.healthy;
        server.healthy = healthRes.statusCode === 200;
        if (prevHealthState !== server.healthy) {
          console.log(
            `Server ${server.hostname}:${server.port} is now ${
              server.healthy ? "healthy" : "unhealthy"
            }`
          );
        }
      });
      resolve(server); // resolve when response is received
    });

    healthRequest.on("timeout", () => {
      server.healthy = false;
      healthRequest.destroy();
      console.log(
        `Health check for server ${server.hostname}:${server.port} has timed out; setting the server as unhealthy`
      );
      resolve(server); // resolve on timeout
    });

    healthRequest.on("error", (err) => {
      server.healthy = false;
      console.error(
        `Health check error for server ${server.hostname}:${server.port} - ${err.name}: ${err.message}`
      );
      if (err.code) {
        console.error(`Error code: ${err.code}`);
      }
      if (err.stack) {
        console.error(err.stack);
      }
      resolve(server); // resolve on error
    });

    healthRequest.end();
    // return server;
  });
};

const healthCheckInterval = setInterval(async () => {
  console.log("Running health checks...");
  await Promise.all(servers.map(checkServerHealth));
}, 10000);

// Cleanup on exit
process.on("SIGINT", () => {
  clearInterval(healthCheckInterval);
  process.exit();
});

app.use(express.json());
app.disable("x-powered-by");

// strip connection headers.
app.use((req, res, next) => {
  const connectionHeaders = [
    "connection",
    "keep-alive",
    "transfer-encoding",
    "te",
    "trailer",
    "upgrade",
    "proxy-authenticate",
    "proxy-authorization",
  ];

  const connectionHeader = req.headers["connection"];
  if (connectionHeader) {
    connectionHeaders.push(
      ...connectionHeader
        .toLowerCase()
        .split(",")
        .map((h) => h.trim())
    );
  }

  for (const header of connectionHeaders) {
    delete req.headers[header];
  }

  next();
});

app.all(/\/(.*)/, (req, res) => {
  // Log the received request details
  console.log(`Received request from ${req.ip}`);
  console.log(`${req.method} ${req.url} HTTP/${req.httpVersion}`);
  console.log(`Host: ${req.headers.host}`);
  console.log(`User-Agent: ${req.headers["user-agent"]}`);
  console.log(`Accept: ${req.headers.accept}`);

  // redirect the request to backend server
  const server = getNextServer();
  if (!server) {
    return res
      .status(503)
      .setHeader("retry-after", 15)
      .send("No healthy servers available\n");
  }
  console.log(
    `Forwarding request to backend: ${server.hostname}:${server.port}`
  );

  const options = {
    hostname: server.hostname,
    port: server.port,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      connection: "keep-alive",
    },
    agent, // use the custom agent
  };
  delete options.headers.host;

  // Set X-Forwarded-* headers
  const clientIp = req.ip || req.socket.remoteAddress;
  if (options.headers["x-forwarded-for"]) {
    options.headers["x-forwarded-for"] += `,${clientIp}`;
  } else {
    options.headers["x-forwarded-for"] = clientIp;
  }
  options.headers["x-forwarded-proto"] = req.protocol;
  if (req.headers.host) {
    options.headers["x-forwarded-host"] = req.headers.host;
  }

  const start = Date.now();
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
      const duration = Date.now() - start;
      console.log(
        `Backend ${server.hostname}:${server.port} responded in ${duration} ms`
      );

      // log the response
      console.log(bodyData);

      res.status(proxyRes.statusCode);

      Object.keys(proxyRes.headers).forEach((key) => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      res.removeHeader("x-powered-by");

      // send the response back
      res.send(bodyData);
    });

    // handle error while receiving the response
    proxyRes.on("error", (err) => {
      console.error(
        `Proxy response error from server ${server.hostname}:${server.port} - ${err.name}: ${err.message}`
      );
      if (err.code) {
        console.error(`Error code: ${err.code}`);
      }
      if (err.stack) {
        console.error(err.stack);
      }

      res.status(500).end();
    });
  });

  // handle error while sending the request
  proxy.on("error", (err) => {
    console.error(
      `Proxy request connection error from server ${server.hostname}:${server.port} - ${err.name}: ${err.message}`
    );
    if (err.code) {
      console.error(`Error code: ${err.code}`);
    }
    if (err.stack) {
      console.error(err.stack);
    }

    // Mark server as unhealthy immediately on proxy error
    server.healthy = false;
    if (!res.headersSent) {
      res.status(502).send("Bad Gateway\n");
    }
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
