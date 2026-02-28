/**
 * 配置聚合：从环境变量读取，提供默认值
 */
module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  /** MongoDB 连接串，本地示例：mongodb://127.0.0.1:27017/use_cursor */
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/use_cursor',
  /** JWT 密钥：生产环境务必通过环境变量设置强随机值 */
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  /** 晶石游戏：每轮时长（秒） */
  roundSeconds: parseInt(process.env.ROUND_SECONDS || '60', 10),
};
