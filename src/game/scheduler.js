/**
 * 晶石游戏自动轮次调度：
 * - 确保始终有一轮 open
 * - 每轮到达 roundSeconds 后自动结算并开启下一轮
 */
const config = require('../config');
const GameRound = require('../models/GameRound');
const gameService = require('../services/gameService');

let timer = null;
let isSettling = false;

async function tick() {
  if (isSettling) return;

  // 确保有 open 轮次
  let round = await GameRound.findOne({ status: 'open' }).sort({ roundNumber: -1 }).lean();
  if (!round) {
    await gameService.getCurrentRound(); // 内部会创建
    round = await GameRound.findOne({ status: 'open' }).sort({ roundNumber: -1 }).lean();
    if (!round) return;
  }

  const durationMs = Math.max(1, config.roundSeconds) * 1000;
  const age = Date.now() - new Date(round.startAt).getTime();
  if (age < durationMs) return;

  isSettling = true;
  try {
    await gameService.settleCurrentRoundAndCreateNew();
  } finally {
    isSettling = false;
  }
}

async function startGameScheduler() {
  // 启动时先确保有一轮
  await gameService.getCurrentRound();

  // 每秒检查一次是否到期（简单可靠）
  timer = setInterval(() => {
    tick().catch((e) => console.error('game scheduler error:', e));
  }, 1000);
}

function stopGameScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startGameScheduler, stopGameScheduler };

