const httpServer = require('http');
const app = require('./app/app');
const { logger } = require('./app/helpers/logger');

// Get port from environment and store in Express.
const PORT = process.env.PORT || 3000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

const server = httpServer.createServer(app);
// eslint-disable-next-line import/order
const io = require('socket.io')(server);
// eslint-disable-next-line no-unused-vars
io.on('connection', (s) => {});

server.listen(PORT, HOST, () => {
  logger.info(`SIMPL Dashboard API listening at http://${HOST}:${PORT}`);
  console.info(`SIMPL Dashboard API listening at http://${HOST}:${PORT}`);
});
