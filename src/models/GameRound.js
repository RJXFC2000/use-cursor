/**
 * 游戏轮次：每 60s 一轮，两座山（青龙山/白虎山）中随机一座在本轮变为「金山」
 */
const mongoose = require('mongoose');

const MOUNTAINS = ['青龙山', '白虎山'];

const gameRoundSchema = new mongoose.Schema(
  {
    roundNumber: { type: Number, required: true, unique: true },
    /** 本轮哪座山是金山（结算前不对外暴露） */
    goldenMountain: { type: String, required: true, enum: MOUNTAINS },
    status: { type: String, required: true, enum: ['open', 'settled'], default: 'open' },
    startAt: { type: Date, default: Date.now },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

gameRoundSchema.statics.MOUNTAINS = MOUNTAINS;
module.exports = mongoose.model('GameRound', gameRoundSchema);
