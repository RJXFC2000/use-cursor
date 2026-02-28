/**
 * Express 应用：挂载中间件与路由
 */
const express = require('express');
const path = require('path');
const routes = require('./routes');
const middlewares = require('./middlewares');

const app = express();

// 通用中间件
app.use(middlewares.requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 路由统一挂载到 /api
app.use('/api', routes);

// 可选：托管前端构建产物（frontend/dist）
// 开关：SERVE_FRONTEND=true
if (String(process.env.SERVE_FRONTEND || '').toLowerCase() === 'true') {
  const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distDir));
  // SPA fallback（排除 /api）
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// 404
app.use(middlewares.notFound);
// 统一错误处理
app.use(middlewares.errorHandler);

module.exports = app;
