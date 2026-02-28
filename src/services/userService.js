/**
 * 用户相关业务逻辑：与数据库交互放在 service 层
 */
const User = require('../models/User');

async function listUsers() {
  return User.find().sort({ createdAt: -1 }).lean();
}

async function getUserById(id) {
  return User.findById(id).lean();
}

module.exports = {
  listUsers,
  getUserById,
};
