const express = require('express');
const gameController = require('../controllers/gameController');
const { authRequired } = require('../middlewares');

const router = express.Router();
router.use(authRequired);

router.get('/current', gameController.currentRound);
router.post('/bet', gameController.bet);

router.get('/rounds', gameController.rounds);
router.get('/rounds/:id', gameController.roundById);

router.get('/leaderboard', gameController.leaderboard);
router.get('/my/bets', gameController.myBets);

// 调试：手动结算（可选）
router.post('/settle', gameController.settleNow);

module.exports = router;

