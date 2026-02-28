/**
 * 晶石余额与流水
 */
const User = require('../models/User');
const CrystalTransaction = require('../models/CrystalTransaction');

async function ensureInitialized(userId) {
  const u = await User.findById(userId).select('crystalBalance').lean();
  if (!u) return;
  if (typeof u.crystalBalance === 'number') return;

  // 老用户补默认晶石，并记一条 grant 流水（只补一次）
  const existedGrant = await CrystalTransaction.exists({ user: userId, type: 'grant' });
  if (existedGrant) {
    await User.updateOne({ _id: userId, crystalBalance: { $exists: false } }, { $set: { crystalBalance: 100 } });
    return;
  }

  await User.updateOne({ _id: userId }, { $set: { crystalBalance: 100 } });
  await CrystalTransaction.create({
    user: userId,
    type: 'grant',
    amount: 100,
    balanceAfter: 100,
  });
}

async function getBalance(userId) {
  await ensureInitialized(userId);
  const u = await User.findById(userId).select('crystalBalance').lean();
  return u ? (u.crystalBalance ?? 0) : 0;
}

/** 扣减晶石（下注）：原子校验余额，避免并发超扣 */
async function deductChecked(userId, amount, ref = {}) {
  await ensureInitialized(userId);
  const updated = await User.findOneAndUpdate(
    { _id: userId, crystalBalance: { $gte: amount } },
    { $inc: { crystalBalance: -amount } },
    { new: true }
  );
  if (!updated) {
    const err = new Error('晶石余额不足');
    err.statusCode = 400;
    throw err;
  }
  await CrystalTransaction.create({
    user: userId,
    type: 'bet',
    amount: -amount,
    balanceAfter: updated.crystalBalance,
    round: ref.roundId,
    bet: ref.betId,
  });
}

/** 增加晶石（赢时发放奖励） */
async function add(userId, amount, ref = {}) {
  await ensureInitialized(userId);
  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: { crystalBalance: amount } },
    { new: true }
  );
  if (!updated) return;
  await CrystalTransaction.create({
    user: userId,
    type: 'win',
    amount,
    balanceAfter: updated.crystalBalance,
    round: ref.roundId,
    bet: ref.betId,
  });
}

/** 仅记一条「输」的流水（下注时已扣过余额，这里只做记录） */
async function recordLose(userId, amount, ref = {}) {
  const balance = await getBalance(userId);
  await CrystalTransaction.create({
    user: userId,
    type: 'lose',
    amount: -amount,
    balanceAfter: balance,
    round: ref.roundId,
    bet: ref.betId,
  });
}

/** 晶石流水列表 */
async function getTransactions(userId, page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * limit;
  const [list, total] = await Promise.all([
    CrystalTransaction.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('round', 'roundNumber status').lean(),
    CrystalTransaction.countDocuments({ user: userId }),
  ]);
  return { list, total, page, limit };
}

module.exports = {
  getBalance,
  deductChecked,
  add,
  recordLose,
  getTransactions,
};
