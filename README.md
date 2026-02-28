# use-cursor-backend

Node.js 后端项目，现已集成前端小游戏，目录清晰、便于扩展。

## 目录结构

```
├── index.js                # 后端入口，连接数据库并启动服务
├── package.json            # 根 package.json（提供前后端脚本）
├── .env.example            # 环境变量示例（复制为 .env 使用）
├── README.md
├── src/                    # 后端源码
│   ├── app.js              # Express 应用（中间件 + 路由聚合，API 前缀 /api）
│   ├── config/             # 配置（含 MONGODB_URI 等）
│   ├── db/                 # 数据库连接
│   │   └── connect.js
│   ├── middlewares/        # 中间件（日志、错误处理、404、鉴权）
│   ├── routes/             # 路由定义（/api 下挂载）
│   ├── controllers/        # 控制器
│   ├── services/           # 业务逻辑层
│   ├── models/             # Mongoose 模型（如 User）
│   └── utils/              # 工具函数
└── frontend/               # 前端小游戏（Vite + React）
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx         # 简单 Canvas 小游戏（可扩展）
        └── styles.css
```

## 快速开始

```bash
# 根目录安装依赖（会安装后端与前端依赖）
npm install
cd frontend && npm install
```

### 开发环境

```bash
# 启动后端（http://localhost:3000）
npm run dev:backend

# 另开一个终端，启动前端（http://localhost:5173）
npm run dev:frontend
```

前端开发时，所有 `/api/**` 请求会被 Vite 代理到 `http://localhost:3000`。

### 生产环境

```bash
# 构建前端
npm run build:frontend

# 设置环境变量，启用后端托管前端静态资源
# .env 中：SERVE_FRONTEND=true

# 启动后端（会同时提供 API 和前端页面）
npm start
```

默认服务：

- 前端页面：  
  - 开发：`http://localhost:5173`  
  - 生产：`http://localhost:3000`（由后端静态托管 `frontend/dist`）
- 后端 API（统一前缀 `/api`）：  
  - `GET /api/`：接口简要信息  
  - `GET /api/health`：健康检查（探活）  
  - `POST /api/auth/register`：注册（body: `{ "name", "email", "password" }`）  
  - `POST /api/auth/login`：登录（body: `{ "email", "password" }`）  
  - `GET /api/auth/me`：获取当前用户（需 Bearer token）  
  - `GET /api/users`：用户列表（需 Bearer token）  
  - `GET /api/users/:id`：按 id 查用户（需 Bearer token）  
  - 晶石：  
    - `GET /api/crystals/balance`：查看晶石余额（需 Bearer token，新用户默认 100）  
    - `GET /api/crystals/transactions`：晶石流水（需 Bearer token）  
  - 晶石游戏（每轮默认 60s）：  
    - `GET /api/game/current`：当前轮次（不暴露金山）  
    - `POST /api/game/bet`：下注/改选/追加（body: `{ "roundId", "mountain", "amount" }`；已下注后可只传 `mountain` 改选，或传 `amount` 追加）  
    - `GET /api/game/rounds`：历史轮次列表（结算后才会返回金山）  
    - `GET /api/game/rounds/:id`：轮次详情 + 我的下注  
    - `GET /api/game/leaderboard`：排行榜（按净赢 totalProfit 排序）  
    - `GET /api/game/my/bets`：我的参与记录  

## 数据库（MongoDB）

项目使用 **Mongoose** 连接 MongoDB。启动前请确保：

1. **本地 MongoDB**：安装并启动 MongoDB 服务，默认连接 `mongodb://127.0.0.1:27017/use_cursor`。
2. **或使用 MongoDB Atlas**：在 [Atlas](https://www.mongodb.com/atlas) 创建免费集群，复制连接串到 `.env` 的 `MONGODB_URI`。

复制 `.env.example` 为 `.env`，如需自定义数据库地址则设置：

```env
MONGODB_URI=mongodb://127.0.0.1:27017/use_cursor
```

启动成功会看到 `MongoDB connected: ...`。新增集合/表只需在 `src/models/` 增加 Schema，在 `services/` 和 `routes/` 中按 User 示例扩展即可。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| MONGODB_URI | MongoDB 连接串 | mongodb://127.0.0.1:27017/use_cursor |
| JWT_SECRET | JWT 密钥（生产必填强随机） | dev-only-secret |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |
| BCRYPT_SALT_ROUNDS | bcrypt rounds | 10 |
| ROUND_SECONDS | 晶石游戏每轮时长（秒） | 60 |

## 扩展建议

- 新接口：在 `src/routes/` 新增路由，在 `src/routes/index.js` 挂载；逻辑放在 `controllers/`、`services/`。
- 新模型：在 `src/models/` 新建 Mongoose Schema，在对应 service 中调用。
- 鉴权：在 `src/middlewares/` 增加认证中间件，在需要保护的路由上使用。
# use-cursor
