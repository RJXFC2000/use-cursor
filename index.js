/**
 * 应用入口：加载环境变量、连接数据库后启动 HTTP 服务
 */
require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config');
const { connectDB } = require('./src/db/connect');
const { startGameScheduler } = require('./src/game/scheduler');

async function start() {
  await connectDB();
  await startGameScheduler();
  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
