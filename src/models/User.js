/**
 * 用户模型示例（Mongoose Schema）
 * 可按业务增删字段、加索引与校验
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    /** 游戏道具「晶石」余额，新用户默认 100 */
    crystalBalance: { type: Number, default: 100, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
