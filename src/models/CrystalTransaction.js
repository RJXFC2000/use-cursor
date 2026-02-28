/**
 * 晶石流水：每次变动（发放、下注、赢/输）记一条
 */
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** grant=发放 bet=下注 win=赢 lose=输 */
    type: { type: String, required: true, enum: ['grant', 'bet', 'win', 'lose'] },
    /** 变动数量：正为增加，负为减少 */
    amount: { type: Number, required: true },
    /** 变动后余额快照 */
    balanceAfter: { type: Number, required: true },
    round: { type: mongoose.Schema.Types.ObjectId, ref: 'GameRound' },
    bet: { type: mongoose.Schema.Types.ObjectId, ref: 'Bet' },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('CrystalTransaction', transactionSchema);
