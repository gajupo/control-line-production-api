const { Sequelize, Op, QueryTypes } = require('sequelize');
const _ = require('lodash/');
const { utcToZonedTime } = require('date-fns-tz');
const datefns = require('date-fns');
const differenceInMinutes = require('date-fns/differenceInMinutes');
const models = require('../models');
const { sequelize, getDatePartConversion } = require('../helpers/sequelize');
const { logger } = require('../helpers/logger');