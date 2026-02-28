/**
 * 请求日志中间件：打印 method + url
 */
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
}

module.exports = requestLogger;
