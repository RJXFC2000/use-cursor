/**
 * 健康检查：用于探活与运维
 */
function getHealth(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

module.exports = { getHealth };
