const crystalService = require('../services/crystalService');

async function balance(req, res, next) {
  try {
    const bal = await crystalService.getBalance(req.user.id);
    res.json({ data: { balance: bal } });
  } catch (e) {
    next(e);
  }
}

async function transactions(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const data = await crystalService.getTransactions(req.user.id, page, limit);
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

module.exports = { balance, transactions };

