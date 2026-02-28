/**
 * 用户相关路由
 */
const express = require('express');
const userController = require('../controllers/userController');
const { authRequired } = require('../middlewares');

const router = express.Router();
router.use(authRequired);
router.get('/', userController.list);
router.get('/:id', userController.getById);

module.exports = router;
