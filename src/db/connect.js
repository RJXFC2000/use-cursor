/**
 * 数据库连接：MongoDB（Mongoose）
 * 在入口 index.js 启动前调用，确保就绪后再监听端口
 */
const mongoose = require('mongoose');
const config = require('../config');

async function connectDB() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
