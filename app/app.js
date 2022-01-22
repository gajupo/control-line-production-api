const compression = require('compression');
const winston = require('winston');
const express = require('express');
const cors = require('cors');
const config = require('config');
// mongoose-morgan
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error-handler');

const app = express();
const { logger, unHandledExceptionsTransport } = require('./helpers/logger');
// catch uncaught exceptions and unhandledRejection
winston.exceptions.handle(unHandledExceptionsTransport);
// will re-throw to winston unhandled promise rejections
process.on('unhandledRejection', (ex) => {
  throw ex;
});
// Logger to mongo example
// app.use(
//   morgan(
//     {
//       dbName: 'simpl_logs',
//       collection: 'simpl_api',
//       connectionString: 'mongodb://mongo:27017/',
//       user: 'root',
//       pass: 'simpl2022',
//     },
//     {}, 'combined'
//   )
// );
// create a Morgan middleware instance
// store 500 errors on a file
const morganMiddleware = morgan('combined', {
  // specify a function for skipping requests without errors
  skip: (req, res) => res.statusCode < 400,
  // specify a stream for requests logging
  stream: {
    write: (msg) => logger.http(msg),
  },
});
// apply the middleware
app.use(morganMiddleware);
app.use(express.json());
app.use(cors());
// compress all response
app.use(compression());
// allow update log at runtime
app.get('/updateloglevel/:transportname/:newlevel', (req, res) => {
  try {
    for (let index = 0; index < logger.transports.length; index++) {
      const transport = logger.transports[index];
      if (transport.options.name === req.params.transportname) {
        transport.level = req.params.newlevel;
        return res.json({ message: 'Log level updated' });
      }
    }
    return res.status(400).json({ message: 'transport not found' });
  } catch (error) {
    logger.error(error.message);
    return res.status(500).json({ message: 'unable to change log level' });
  }
});
// api routes
app.use('/api/customers', require('./routes/customers'));
app.use('/api/line-dashboard', require('./routes/line-dashboard'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/order', require('./routes/order'));
app.use('/api/productionlines', require('./routes/production-lines'));
app.use('/api/reportlist', require('./routes/reports'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/stopcauselogs', require('./routes/stop-cause-log'));
app.use('/api/validationresults', require('./routes/validation-results'));
app.use('/api/unblock', require('./routes/operating-stations'));

app.use(errorHandler);
logger.info(`host= ${config.get('database.host')}, port= ${config.get('database.port')}, database = ${config.get('database.name')}
, username =${config.get('database.user')}`);

module.exports = app;
