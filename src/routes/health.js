/**
 * 健康检查路由
 */
const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();
router.get('/', healthController.getHealth);

module.exports = router;
