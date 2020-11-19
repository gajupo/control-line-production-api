'use strict';

const config = require('config');
const {Sequelize} = require('sequelize');

const sequelize = new Sequelize(
    config.get("database.name"),
    config.get("database.user"),
    config.get("database.password"), {
    dialect: 'mssql',
    host: config.get("database.host"),
    port: config.get("database.port")
});

module.exports.sequelize = sequelize;
