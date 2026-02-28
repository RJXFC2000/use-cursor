/**
 * 用户接口：处理请求与响应，业务逻辑在 userService
 */
const userService = require('../services/userService');

async function list(req, res, next) {
  try {
    const users = await userService.listUsers();
    res.json({ data: users });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
