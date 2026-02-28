const express = require('express');
const crystalController = require('../controllers/crystalController');
const { authRequired } = require('../middlewares');

const router = express.Router();
router.use(authRequired);

router.get('/balance', crystalController.balance);
router.get('/transactions', crystalController.transactions);

module.exports = router;

