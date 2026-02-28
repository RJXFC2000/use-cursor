const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

async function register({ name, email, password }) {
  if (!name || !email || !password) {
    const err = new Error('name、email、password 为必填');
    err.statusCode = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

  try {
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);
    return { token, user: { id: user._id, name: user.name, email: user.email } };
  } catch (e) {
    // MongoDB duplicate key (unique email)
    if (e && e.code === 11000) {
      const err = new Error('该邮箱已注册');
      err.statusCode = 409;
      throw err;
    }
    throw e;
  }
}

async function login({ email, password }) {
  if (!email || !password) {
    const err = new Error('email、password 为必填');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    const err = new Error('邮箱或密码错误');
    err.statusCode = 401;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('邮箱或密码错误');
    err.statusCode = 401;
    throw err;
  }

  const token = signToken(user);
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}

async function getPublicUserById(id) {
  const user = await User.findById(id).lean();
  if (!user) return null;
  return { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt };
}

module.exports = {
  register,
  login,
  getPublicUserById,
};

