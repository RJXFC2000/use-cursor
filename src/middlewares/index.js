/**
 * 中间件统一导出
 */
const requestLogger = require('./requestLogger');
const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const authRequired = require('./authRequired');

module.exports = {
  requestLogger,
  errorHandler,
  notFound,
  authRequired,
};
