/**
 * 下注/参与记录：玩家在某轮选中一座山并投入晶石
 */
const mongoose = require('mongoose');

const betSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    round: { type: mongoose.Schema.Types.ObjectId, ref: 'GameRound', required: true },
    mountain: { type: String, required: true, enum: ['青龙山', '白虎山'] },
    amount: { type: Number, required: true, min: 1 },
    /** pending | win | lose */
    result: { type: String, required: true, enum: ['pending', 'win', 'lose'], default: 'pending' },
    /** 结算后：赢时为 2*amount，输为 0 */
    reward: { type: Number, default: 0 },
  },
  { timestamps: true }
);

betSchema.index({ round: 1, user: 1 }, { unique: true });
betSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Bet', betSchema);
