/**
 * 统一错误处理：返回 JSON 错误信息，避免泄露堆栈
 */
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  console.error(err);
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
