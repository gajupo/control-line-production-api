const httpServer = require('http');
const app = require('./app/app');
const { logger } = require('./app/helpers/logger');

// Get port from environment and store in Express.
const PORT = process.env.PORT || 3000;
const HOST = process.env.SERVER_HOST || '0.0.0.0';

const server = httpServer.createServer(app);
server.listen(PORT, HOST, () => {
  logger.info(`SIMPL Dashboard API listening at http://localhost:${PORT}`);
  console.log(`SIMPL Dashboard API listening at http://localhost:${PORT}`);
});
