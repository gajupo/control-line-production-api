const config = require('config');
const { Sequelize } = require('sequelize');
const { loggers } = require('winston');

// TODO: Check regularly for an official fix to this issue
// https://github.com/sequelize/sequelize/issues/7879
Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
  return this._applyTimezone(date, options).format('YYYY-MM-DD HH:mm:ss.SSS');
};
const sequelize = new Sequelize(
  config.get('database.name'),
  config.get('database.user'),
  config.get('database.password'), {
    dialect: 'mssql',
    logging: loggers.debug,
    host: config.get('database.host'),
    port: config.get('database.port'),
    dialectOptions: {
      options: {
        validateBulkLoadParameters: true,
      },
    },
    pool: {
      max: 30,
      idle: 30000,
      acquire: 60000,
    },
  }
);

function getDatePartConversion(column) {
  return Sequelize.fn('CONVERT', Sequelize.literal('date'), Sequelize.col(`${column}`));
}

module.exports.sequelize = sequelize;
module.exports.getDatePartConversion = getDatePartConversion;
