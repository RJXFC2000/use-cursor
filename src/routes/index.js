/**
 * 路由聚合：挂载各业务路由
 */
const express = require('express');
const healthRoutes = require('./health');
const usersRoutes = require('./users');
const authRoutes = require('./auth');
const gameRoutes = require('./game');
const crystalsRoutes = require('./crystals');

const router = express.Router();

// API 根路径简要信息（实际挂载在 /api）
router.get('/', (req, res) => {
  res.json({ name: 'use-cursor-backend', version: '1.0.0' });
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/game', gameRoutes);
router.use('/crystals', crystalsRoutes);

module.exports = router;
