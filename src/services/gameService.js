/**
 * 晶石游戏：青龙山/白虎山，每 60s 一轮随机一座变金山，下注猜中奖励翻倍
 */
const GameRound = require('../models/GameRound');
const Bet = require('../models/Bet');
const crystalService = require('./crystalService');

const MOUNTAINS = GameRound.MOUNTAINS;

function pickGoldenMountain() {
  return MOUNTAINS[Math.floor(Math.random() * MOUNTAINS.length)];
}

/** 获取当前可下注的轮次（open），若无则创建一轮 */
async function getOrCreateCurrentRound() {
  let round = await GameRound.findOne({ status: 'open' }).sort({ roundNumber: -1 }).limit(1).lean();
  if (round) return round;
  const last = await GameRound.findOne().sort({ roundNumber: -1 }).select('roundNumber').lean();
  const roundNumber = last ? last.roundNumber + 1 : 1;
  const newRound = await GameRound.create({
    roundNumber,
    goldenMountain: pickGoldenMountain(),
    status: 'open',
  });
  return newRound.toObject();
}

/** 当前轮（不暴露 goldenMountain） */
async function getCurrentRound() {
  const round = await getOrCreateCurrentRound();
  return {
    id: round._id,
    roundNumber: round.roundNumber,
    status: round.status,
    startAt: round.startAt,
    mountains: MOUNTAINS,
  };
}

/**
 * 下注/改选：
 * - 同一轮同一玩家只有一条 bet（不能分别押两座山）
 * - 允许在结算前随意切换 mountain
 * - 允许多次追加 amount（累加到同一条 bet 上）
 *
 * 参数约定：
 * - 创建下注：mountain 必填，amount>=1
 * - 已下注后：mountain 可用于改选；amount>0 表示追加投入；amount 缺省/0 仅改选不追加
 */
async function placeBet(userId, { roundId, mountain, amount }) {
  if (!roundId) {
    const err = new Error('roundId 必填');
    err.statusCode = 400;
    throw err;
  }
  if (mountain && !MOUNTAINS.includes(mountain)) {
    const err = new Error('mountain 只能是 青龙山 或 白虎山');
    err.statusCode = 400;
    throw err;
  }
  if (amount != null && Number(amount) < 0) {
    const err = new Error('amount 不能小于 0');
    err.statusCode = 400;
    throw err;
  }

  const round = await GameRound.findById(roundId).lean();
  if (!round) {
    const err = new Error('轮次不存在');
    err.statusCode = 404;
    throw err;
  }
  if (round.status !== 'open') {
    const err = new Error('该轮已结束，无法下注');
    err.statusCode = 400;
    throw err;
  }

  const existing = await Bet.findOne({ round: roundId, user: userId });
  if (!existing) {
    if (!mountain || !amount || amount < 1) {
      const err = new Error('首次下注需要 mountain 且 amount>=1');
      err.statusCode = 400;
      throw err;
    }
    const bet = await Bet.create({ user: userId, round: roundId, mountain, amount, result: 'pending' });
    try {
      await crystalService.deductChecked(userId, amount, { roundId, betId: bet._id });
    } catch (e) {
      await Bet.deleteOne({ _id: bet._id });
      throw e;
    }
    return bet.toObject();
  }

  if (existing.result !== 'pending') {
    const err = new Error('该轮已结算，无法修改');
    err.statusCode = 400;
    throw err;
  }

  // 改选山（不影响金额）
  if (mountain && mountain !== existing.mountain) {
    existing.mountain = mountain;
  }

  // 追加投入（累加）
  const delta = amount ? Number(amount) : 0;
  if (delta > 0) {
    await crystalService.deductChecked(userId, delta, { roundId, betId: existing._id });
    existing.amount += delta;
  }

  await existing.save();
  return existing.toObject();
}

/** 结算当前轮并开启新一轮（由定时每 60s 调用或管理员调用） */
async function settleCurrentRoundAndCreateNew() {
  const round = await GameRound.findOne({ status: 'open' }).sort({ roundNumber: -1 });
  if (!round) {
    return await getOrCreateCurrentRound();
  }

  const bets = await Bet.find({ round: round._id }).lean();
  const goldenMountain = round.goldenMountain;

  for (const bet of bets) {
    const isWin = bet.mountain === goldenMountain;
    const reward = isWin ? bet.amount * 2 : 0;
    await Bet.updateOne({ _id: bet._id }, { result: isWin ? 'win' : 'lose', reward });
    if (isWin) {
      await crystalService.add(bet.user, reward, { type: 'win', roundId: round._id, betId: bet._id });
    } else {
      await crystalService.recordLose(bet.user, bet.amount, { roundId: round._id, betId: bet._id });
    }
  }

  await GameRound.updateOne({ _id: round._id }, { status: 'settled', settledAt: new Date() });
  const next = await getOrCreateCurrentRound();
  return next;
}

/** 排行榜：按总赢得晶石排序 */
async function getLeaderboard(limit = 20) {
  const list = await Bet.aggregate([
    { $match: { result: { $in: ['win', 'lose'] } } },
    {
      $group: {
        _id: '$user',
        /** 净赢：赢一把净 +amount；输一把净 -amount */
        totalProfit: {
          $sum: {
            $cond: [{ $eq: ['$result', 'win'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
        totalReward: { $sum: '$reward' },
      },
    },
    { $sort: { totalProfit: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $project: { userId: '$_id', name: '$u.name', email: '$u.email', totalProfit: 1, totalReward: 1, _id: 0 } },
  ]);
  return list.map((r, i) => ({ rank: i + 1, ...r }));
}

/** 当前用户的参与记录（下注记录） */
async function getMyBets(userId, page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * limit;
  const [bets, total] = await Promise.all([
    Bet.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('round', 'roundNumber status goldenMountain startAt settledAt').lean(),
    Bet.countDocuments({ user: userId }),
  ]);
  // 避免在未结算轮次中泄露 goldenMountain
  for (const b of bets) {
    if (b.round && b.round.status !== 'settled') {
      delete b.round.goldenMountain;
    }
  }
  return { list: bets, total, page, limit };
}

/** 单轮详情（结算后可看 goldenMountain） */
async function getRoundById(roundId, userId) {
  const round = await GameRound.findById(roundId).lean();
  if (!round) return null;
  const myBet = await Bet.findOne({ round: roundId, user: userId }).lean();
  const publicRound = {
    id: round._id,
    roundNumber: round.roundNumber,
    status: round.status,
    startAt: round.startAt,
    settledAt: round.settledAt,
    mountains: MOUNTAINS,
    goldenMountain: round.status === 'settled' ? round.goldenMountain : undefined,
    myBet: myBet ? { mountain: myBet.mountain, amount: myBet.amount, result: myBet.result, reward: myBet.reward } : null,
  };
  return publicRound;
}

/** 历史轮次列表 */
async function getRounds(page = 1, limit = 20) {
  const skip = (Math.max(1, page) - 1) * limit;
  const [list, total] = await Promise.all([
    GameRound.find().sort({ roundNumber: -1 }).skip(skip).limit(limit).lean(),
    GameRound.countDocuments(),
  ]);
  return {
    list: list.map((r) => ({
      id: r._id,
      roundNumber: r.roundNumber,
      status: r.status,
      startAt: r.startAt,
      settledAt: r.settledAt,
      goldenMountain: r.status === 'settled' ? r.goldenMountain : undefined,
    })),
    total,
    page,
    limit,
  };
}

module.exports = {
  getCurrentRound,
  placeBet,
  settleCurrentRoundAndCreateNew,
  getLeaderboard,
  getMyBets,
  getRoundById,
  getRounds,
  MOUNTAINS,
};
