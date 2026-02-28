/**
 * 404 处理：未匹配到的路由
 */
function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found', path: req.url });
}

module.exports = notFound;
