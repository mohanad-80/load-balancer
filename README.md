# Load Balancer

A simple HTTP load balancer built with Node.js and Express. It distributes incoming requests to multiple backend servers using a round-robin algorithm and performs periodic health checks to ensure requests are only sent to healthy servers.

## Architecture Diagram

![Load Balancer Architecture](./load-balancer-diagram.svg)

## Features

- **Round-robin load balancing** across multiple backend servers
- **Health checks** for backend servers (via `/health` endpoint)
- **Automatic failover**: unhealthy servers are skipped until healthy again
- **Detailed logging** of incoming requests and backend responses
- **Handles all HTTP methods and paths**
- **Graceful shutdown** on SIGINT
- **Persistent connections** to backends using HTTP keep-alive
- **Add relevant forward headers for proxy best practice** (client IP, protocol, host, port)
- **Sanitize the client request and response headers for security**
- **Customizable keep-alive and maxSockets settings**
- **Detailed logging for errors and useful info**

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/mohanad-80/load-balancer.git
   cd load-balancer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Backend Servers

Start multiple backend servers on different ports (e.g., 3001, 3002, 3003):

```bash
PORT=3001 node be.js
PORT=3002 node be.js
PORT=3003 node be.js
```

You can use multiple terminals or a process manager like [pm2](https://pm2.keymetrics.io/).

### Running the Load Balancer

Start the load balancer (listens on port 3000 by default):

```bash
node lb.js
```

### Usage

Send HTTP requests to the load balancer:

```bash
curl http://localhost:3000/
```

Requests will be forwarded to healthy backend servers in round-robin order.

## Project Structure

- `lb.js` - Main load balancer logic
- `be.js` - Simple backend server for testing
- `package.json` - Project metadata and dependencies

## Customization

- Edit the `servers` array in `lb.js` to add or remove backend servers.
- Adjust health check interval or timeout as needed.
- Tune keep-alive and `maxSockets` settings in the custom HTTP agent.
- Add or modify forwarded headers as needed for your environment.

## Logging

- Logs which backend server handled each request.
- Logs backend response times.
- Logs health check status changes for each backend.
- Logs errors and timeouts with details.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

**Author:** Mohanad Ahmed
