import React, { useEffect, useRef, useState } from 'react';
import {
  crystalBalanceApi,
  crystalTransactionsApi,
  gameBetApi,
  gameCurrentApi,
  gameLeaderboardApi,
  gameMyBetsApi,
  gameRoundByIdApi,
  loginApi,
  meApi,
  registerApi,
  type AuthUser,
  type Bet,
  type CrystalTransaction,
  type CurrentRound,
  type LeaderboardRow,
  type Mountain,
  type MyBetItem,
  type RoundDetail
} from './api';

type Player = {
  x: number;
  y: number;
  size: number;
  speed: number;
};

const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 260;

type AuthMode = 'login' | 'register';

const STORAGE_KEY = 'use_cursor_token';

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [player, setPlayer] = useState<Player>({
    x: CANVAS_WIDTH / 2 - 15,
    y: CANVAS_HEIGHT / 2 - 15,
    size: 30,
    speed: 3
  });
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.key]: true }));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys((prev) => ({ ...prev, [e.key]: false }));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      setPlayer((prev) => {
        let { x, y } = prev;
        if (keys['ArrowUp'] || keys['w']) y -= prev.speed;
        if (keys['ArrowDown'] || keys['s']) y += prev.speed;
        if (keys['ArrowLeft'] || keys['a']) x -= prev.speed;
        if (keys['ArrowRight'] || keys['d']) x += prev.speed;

        const half = prev.size / 2;
        x = Math.max(half, Math.min(CANVAS_WIDTH - half, x));
        y = Math.max(half, Math.min(CANVAS_HEIGHT - half, y));

        return { ...prev, x, y };
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          ctx.fillStyle = '#111827';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          ctx.fillStyle = '#1f2937';
          for (let i = 0; i < CANVAS_WIDTH; i += 32) {
            for (let j = 0; j < CANVAS_HEIGHT; j += 32) {
              ctx.fillRect(i + 1, j + 1, 30, 30);
            }
          }

          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameId);
  }, [keys, player.x, player.y, player.size, player.speed]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="game-canvas"
    />
  );
};

const ROUND_SECONDS_FALLBACK = 60;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatLeftSeconds(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const CrystalGamePanel: React.FC<{ token: string }> = ({ token }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [leftSeconds, setLeftSeconds] = useState<number>(ROUND_SECONDS_FALLBACK);

  const [selectedMountain, setSelectedMountain] = useState<Mountain | ''>('');
  const [amount, setAmount] = useState<number>(10);
  const [myBet, setMyBet] = useState<Bet | null>(null);

  const [lastSettled, setLastSettled] = useState<RoundDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [myBets, setMyBets] = useState<MyBetItem[]>([]);
  const [transactions, setTransactions] = useState<CrystalTransaction[]>([]);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prevRoundIdRef = useRef<string | null>(null);

  const refreshBalance = async () => {
    const res = await crystalBalanceApi(token);
    setBalance(res.data.balance);
  };

  const refreshLeaderboard = async () => {
    const res = await gameLeaderboardApi(token, 20);
    setLeaderboard(res.data);
  };

  const refreshMyBets = async () => {
    const res = await gameMyBetsApi(token, 1, 20);
    setMyBets(res.data.list);
  };

  const refreshTransactions = async () => {
    const res = await crystalTransactionsApi(token, 1, 20);
    setTransactions(res.data.list);
  };

  const refreshCurrentRound = async () => {
    const res = await gameCurrentApi(token);
    setRound(res.data);
    return res.data;
  };

  const syncMyCurrentBet = async (current: CurrentRound) => {
    // 用我的参与记录里匹配当前 roundId（避免额外接口）
    const res = await gameMyBetsApi(token, 1, 20);
    setMyBets(res.data.list);
    const found = res.data.list.find((b) => String((b.round as any)?._id || b.round) === String(current.id));
    if (found) {
      setMyBet({
        _id: found._id,
        user: found.user,
        round: typeof found.round === 'string' ? found.round : found.round._id,
        mountain: found.mountain,
        amount: found.amount,
        result: found.result,
        reward: found.reward,
        createdAt: found.createdAt,
        updatedAt: found.updatedAt
      });
      setSelectedMountain(found.mountain);
    } else {
      setMyBet(null);
    }
  };

  const computeLeftSeconds = (r: CurrentRound) => {
    const startedAt = new Date(r.startAt).getTime();
    const elapsed = (Date.now() - startedAt) / 1000;
    return clamp(ROUND_SECONDS_FALLBACK - elapsed, 0, ROUND_SECONDS_FALLBACK);
  };

  const settlePreviewIfRoundChanged = async (prevRoundId: string) => {
    // 当前轮次变化，上一轮应已结算：拉取详情用于展示结果（金山+我的下注）
    try {
      const res = await gameRoundByIdApi(token, prevRoundId);
      setLastSettled(res.data);
      // 同步余额/流水/排行榜
      await Promise.all([refreshBalance(), refreshTransactions(), refreshLeaderboard()]);
    } catch {
      // 忽略
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setError(null);
      try {
        const [r] = await Promise.all([
          refreshCurrentRound(),
          refreshBalance(),
          refreshLeaderboard(),
          refreshMyBets(),
          refreshTransactions()
        ]);
        if (!alive) return;
        prevRoundIdRef.current = r.id;
        setLeftSeconds(computeLeftSeconds(r));
        await syncMyCurrentBet(r);
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message || '初始化失败');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!round) return;
    const t = setInterval(() => {
      setLeftSeconds(computeLeftSeconds(round));
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id, round?.startAt]);

  useEffect(() => {
    let stopped = false;
    const t = setInterval(() => {
      (async () => {
        if (stopped) return;
        try {
          const r = await refreshCurrentRound();
          const prev = prevRoundIdRef.current;
          if (prev && r.id !== prev) {
            prevRoundIdRef.current = r.id;
            await settlePreviewIfRoundChanged(prev);
            await syncMyCurrentBet(r);
          }
        } catch {
          // 忽略轮询错误
        }
      })();
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleBet = async () => {
    if (!round) return;
    setError(null);
    setBusy('bet');
    try {
      const payload: { roundId: string; mountain?: Mountain; amount?: number } = { roundId: round.id };
      if (selectedMountain) payload.mountain = selectedMountain;
      if (amount && amount > 0) payload.amount = Number(amount);
      const res = await gameBetApi(token, payload);
      setMyBet(res.data);
      await Promise.all([refreshBalance(), refreshTransactions(), refreshMyBets()]);
    } catch (e) {
      setError((e as Error).message || '下注失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>晶石玩法</h2>
          <p>每轮 60s：青龙山 / 白虎山 随机一座变“金山”，押中奖励翻倍。</p>
        </div>
        <div className="panel-actions">
          <button type="button" onClick={() => refreshBalance()} disabled={busy !== null}>
            刷新余额
          </button>
          <button type="button" onClick={() => refreshLeaderboard()} disabled={busy !== null}>
            刷新排行榜
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="panel-grid">
        <div className="card">
          <h3>我的晶石</h3>
          <div className="kv">
            <span>余额</span>
            <strong>{balance ?? '—'}</strong>
          </div>
          <div className="subtle">新用户默认 100 晶石。</div>
        </div>

        <div className="card">
          <h3>当前轮次</h3>
          <div className="kv">
            <span>轮次</span>
            <strong>#{round ? round.roundNumber : '—'}</strong>
          </div>
          <div className="kv">
            <span>倒计时</span>
            <strong className={leftSeconds <= 3 ? 'danger' : ''}>{formatLeftSeconds(leftSeconds)}</strong>
          </div>
          <div className="subtle">轮次结束后会自动结算并开启下一轮。</div>
        </div>

        <div className="card">
          <h3>下注 / 改选 / 追加</h3>
          <div className="mountain-row">
            {(['青龙山', '白虎山'] as Mountain[]).map((m) => (
              <button
                key={m}
                type="button"
                className={selectedMountain === m ? 'chip active' : 'chip'}
                onClick={() => setSelectedMountain(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="field">
            <label>投入晶石数量</label>
            <input
              type="number"
              min={0}
              step={1}
              value={Number.isFinite(amount) ? amount : 0}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="subtle">首次下注需要选择山且 amount≥1；已下注后可只改选或追加。</div>
          </div>
          <button type="button" className="primary" onClick={handleBet} disabled={!round || busy === 'bet'}>
            {busy === 'bet' ? '提交中...' : '提交'}
          </button>
          {myBet && (
            <div className="subtle" style={{ marginTop: 8 }}>
              我在本轮押：<strong>{myBet.mountain}</strong>，累计投入 <strong>{myBet.amount}</strong>（状态：{myBet.result}
              ）
            </div>
          )}
        </div>
      </div>

      {lastSettled && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>上一轮结算</h3>
          <div className="subtle">
            轮次 #{lastSettled.roundNumber}，金山：<strong>{lastSettled.goldenMountain ?? '—'}</strong>
          </div>
          {lastSettled.myBet ? (
            <div className="subtle">
              你押 {lastSettled.myBet.mountain}，投入 {lastSettled.myBet.amount}，结果：<strong>{lastSettled.myBet.result}</strong>
              ，奖励：<strong>{lastSettled.myBet.reward}</strong>
            </div>
          ) : (
            <div className="subtle">你上一轮未参与。</div>
          )}
        </div>
      )}

      <div className="panel-grid" style={{ marginTop: 12 }}>
        <div className="card">
          <h3>排行榜</h3>
          <div className="table">
            <div className="tr head">
              <div>#</div>
              <div>玩家</div>
              <div>净赢</div>
              <div>总奖励</div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty">暂无数据</div>
            ) : (
              leaderboard.map((r) => (
                <div className="tr" key={r.userId}>
                  <div>{r.rank}</div>
                  <div className="mono">{r.name}</div>
                  <div className={r.totalProfit >= 0 ? 'pos' : 'neg'}>{r.totalProfit}</div>
                  <div>{r.totalReward}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3>我的参与记录（最近 20 条）</h3>
          <div className="table">
            <div className="tr head">
              <div>轮次</div>
              <div>山</div>
              <div>投入</div>
              <div>结果</div>
              <div>奖励</div>
            </div>
            {myBets.length === 0 ? (
              <div className="empty">暂无参与记录</div>
            ) : (
              myBets.map((b) => (
                <div className="tr" key={b._id}>
                  <div>#{b.round.roundNumber}</div>
                  <div>{b.mountain}</div>
                  <div>{b.amount}</div>
                  <div>{b.result}</div>
                  <div>{b.reward}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3>晶石流水（最近 20 条）</h3>
          <div className="table">
            <div className="tr head">
              <div>时间</div>
              <div>类型</div>
              <div>变动</div>
              <div>余额</div>
            </div>
            {transactions.length === 0 ? (
              <div className="empty">暂无流水</div>
            ) : (
              transactions.map((t) => (
                <div className="tr" key={t._id}>
                  <div className="mono">{new Date(t.createdAt).toLocaleString()}</div>
                  <div>{t.type}</div>
                  <div className={t.amount >= 0 ? 'pos' : 'neg'}>{t.amount}</div>
                  <div>{t.balanceAfter}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const LoginPage: React.FC<{
  onAuthed: (token: string, user: AuthUser) => void;
}> = ({ onAuthed }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const { token, user } = await registerApi({ name, email, password });
        localStorage.setItem(STORAGE_KEY, token);
        onAuthed(token, user);
      } else {
        const { token, user } = await loginApi({ email, password });
        localStorage.setItem(STORAGE_KEY, token);
        onAuthed(token, user);
      }
    } catch (err) {
      setError((err as Error).message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>use-cursor 小游戏</h1>
        <p>先登录 / 注册，再进入游戏开始页面。</p>
      </header>

      <main className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label>昵称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入昵称"
                required
              />
            </div>
          )}
          <div className="field">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位密码"
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="primary" disabled={loading}>
            {loading ? '提交中...' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>
      </main>
    </div>
  );
};

const StartPage: React.FC<{
  token: string;
  user: AuthUser;
  onLogout: () => void;
}> = ({ token, user, onLogout }) => {
  return (
    <div className="page">
      <header className="header">
        <h1>开始 · use-cursor 小游戏</h1>
        <p>已登录：可以进行“晶石下注”并开始小游戏。</p>
        <div className="user-info">
          <span>
            当前用户：{user.name}（{user.email}）
          </span>
          <button type="button" onClick={onLogout}>
            退出登录
          </button>
        </div>
      </header>

      <main className="stack">
        <CrystalGamePanel token={token} />
        <div className="content">
          <h2 style={{ margin: '0 0 10px' }}>小游戏</h2>
          <p style={{ margin: '0 0 10px', color: '#9ca3af', fontSize: 13 }}>
            方向键 或 WASD 移动圆点（示例玩法，可继续扩展）。
          </p>
          <GameCanvas />
        </div>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const res = await meApi(saved);
        setToken(saved);
        setUser(res.data);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleAuthed = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (checking) {
    return (
      <div className="page">
        <header className="header">
          <h1>use-cursor 小游戏</h1>
          <p>正在检查登录状态...</p>
        </header>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage onAuthed={handleAuthed} />;
  }

  return <StartPage token={token} user={user} onLogout={handleLogout} />;
};

