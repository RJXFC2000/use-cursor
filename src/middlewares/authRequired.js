const jwt = require('jsonwebtoken');
const config = require('../config');

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: '缺少 Authorization: Bearer <token>' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'token 无效或已过期' });
  }
}

module.exports = authRequired;

