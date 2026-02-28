const gameService = require('../services/gameService');

async function currentRound(req, res, next) {
  try {
    const data = await gameService.getCurrentRound();
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function bet(req, res, next) {
  try {
    const userId = req.user.id;
    const data = await gameService.placeBet(userId, req.body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function rounds(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const data = await gameService.getRounds(page, limit);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function roundById(req, res, next) {
  try {
    const data = await gameService.getRoundById(req.params.id, req.user.id);
    if (!data) return res.status(404).json({ error: 'Round not found' });
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function leaderboard(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const data = await gameService.getLeaderboard(limit);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

async function myBets(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const data = await gameService.getMyBets(req.user.id, page, limit);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

/** 调试/测试：手动结算一轮（生产可移除） */
async function settleNow(req, res, next) {
  try {
    const data = await gameService.settleCurrentRoundAndCreateNew();
    res.json({ data: { nextRoundId: data._id, roundNumber: data.roundNumber } });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  currentRound,
  bet,
  rounds,
  roundById,
  leaderboard,
  myBets,
  settleNow,
};

