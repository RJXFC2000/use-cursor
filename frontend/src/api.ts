export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const hasBody = typeof options.body !== 'undefined';
  if (hasBody) headers['Content-Type'] = 'application/json';
  for (const [k, v] of Object.entries((options.headers || {}) as Record<string, string>)) {
    headers[k] = v;
  }

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = (data && (data.error || data.message)) || `请求失败：${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function registerApi(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function loginApi(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function meApi(token: string): Promise<{ data: AuthUser }> {
  return request<{ data: AuthUser }>('/auth/me', {
    headers: {
      ...authHeaders(token)
    }
  });
}

export type Mountain = '青龙山' | '白虎山';

export type CurrentRound = {
  id: string;
  roundNumber: number;
  status: 'open' | 'settled';
  startAt: string;
  mountains: Mountain[];
};

export type Bet = {
  _id: string;
  user: string;
  round: string;
  mountain: Mountain;
  amount: number;
  result: 'pending' | 'win' | 'lose';
  reward: number;
  createdAt: string;
  updatedAt: string;
};

export type RoundDetail = {
  id: string;
  roundNumber: number;
  status: 'open' | 'settled';
  startAt: string;
  settledAt?: string;
  mountains: Mountain[];
  goldenMountain?: Mountain;
  myBet: null | {
    mountain: Mountain;
    amount: number;
    result: 'pending' | 'win' | 'lose';
    reward: number;
  };
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  email: string;
  totalProfit: number;
  totalReward: number;
};

export type MyBetItem = Bet & {
  round: {
    _id: string;
    roundNumber: number;
    status: 'open' | 'settled';
    startAt: string;
    settledAt?: string;
    goldenMountain?: Mountain;
  };
};

export type Paged<T> = { list: T[]; total: number; page: number; limit: number };

export type CrystalBalance = { balance: number };

export type CrystalTransaction = {
  _id: string;
  type: 'grant' | 'bet' | 'win' | 'lose';
  amount: number;
  balanceAfter: number;
  createdAt: string;
  round?: { _id: string; roundNumber: number; status: 'open' | 'settled' };
};

export function crystalBalanceApi(token: string): Promise<{ data: CrystalBalance }> {
  return request('/crystals/balance', { headers: authHeaders(token) });
}

export function crystalTransactionsApi(
  token: string,
  page = 1,
  limit = 20
): Promise<{ data: Paged<CrystalTransaction> }> {
  return request(`/crystals/transactions?page=${page}&limit=${limit}`, { headers: authHeaders(token) });
}

export function gameCurrentApi(token: string): Promise<{ data: CurrentRound }> {
  return request('/game/current', { headers: authHeaders(token) });
}

export function gameBetApi(
  token: string,
  payload: { roundId: string; mountain?: Mountain; amount?: number }
): Promise<{ data: Bet }> {
  return request('/game/bet', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function gameRoundByIdApi(token: string, id: string): Promise<{ data: RoundDetail }> {
  return request(`/game/rounds/${id}`, { headers: authHeaders(token) });
}

export function gameLeaderboardApi(token: string, limit = 20): Promise<{ data: LeaderboardRow[] }> {
  return request(`/game/leaderboard?limit=${limit}`, { headers: authHeaders(token) });
}

export function gameMyBetsApi(
  token: string,
  page = 1,
  limit = 20
): Promise<{ data: Paged<MyBetItem> }> {
  return request(`/game/my/bets?page=${page}&limit=${limit}`, { headers: authHeaders(token) });
}

