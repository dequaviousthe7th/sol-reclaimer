interface Env {
  STATS: KVNamespace;
  HELIUS_API_KEY: string;
  ENVIRONMENT: string;
}

interface GlobalStats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  totalWallets: number;
}

interface WalletStats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  uses: number;
}

interface StatsBody {
  solReclaimed: number;
  accountsClosed: number;
  wallet: string;
}

interface RecentReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  timestamp: number;
}

const MAX_RECENT = 10;

// Allowed JSON-RPC methods for the proxy
const ALLOWED_METHODS = new Set([
  'getBalance',
  'getAccountInfo',
  'getParsedTokenAccountsByOwner',
  'getLatestBlockhash',
  'sendRawTransaction',
  'simulateTransaction',
  'getSignatureStatuses',
  'getTransaction',
  'getSlot',
  'getBlockHeight',
  'getMinimumBalanceForRentExemption',
  'getMultipleAccounts',
  'getFeeForMessage',
  'isBlockhashValid',
  'getRecentPrioritizationFees',
]);

// In-memory rate limiting (per-isolate, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed =
    origin === 'https://solreclaimer.net' ||
    origin === 'https://www.solreclaimer.net' ||
    origin.startsWith('http://localhost:');

  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://solreclaimer.net',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status: number, request: Request, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
    },
  });
}

// Validate base58 (simple check for Solana addresses)
function isValidBase58(str: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);
}

async function handleRpc(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return jsonResponse({ error: 'Rate limited' }, 429, request, env);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  // Handle both single and batch requests
  const isBatch = Array.isArray(body);
  const requests = isBatch ? (body as Array<{ method?: string }>) : [body as { method?: string }];

  // Validate all methods
  for (const rpcReq of requests) {
    if (!rpcReq.method || !ALLOWED_METHODS.has(rpcReq.method)) {
      return jsonResponse(
        { error: `Method not allowed: ${rpcReq.method || 'unknown'}` },
        403,
        request,
        env,
      );
    }
  }

  // Forward to Helius
  const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
  const upstream = await fetch(heliusUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await upstream.text();
  return new Response(result, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
    },
  });
}

async function handleGetStats(request: Request, env: Env): Promise<Response> {
  const raw = await env.STATS.get('stats:global');
  const stats: GlobalStats = raw
    ? JSON.parse(raw)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 };

  return jsonResponse(stats, 200, request, env);
}

async function handlePostStats(request: Request, env: Env): Promise<Response> {
  let body: StatsBody;
  try {
    body = await request.json() as StatsBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, request, env);
  }

  const { solReclaimed, accountsClosed, wallet } = body;

  if (
    typeof solReclaimed !== 'number' ||
    typeof accountsClosed !== 'number' ||
    typeof wallet !== 'string' ||
    !isValidBase58(wallet) ||
    solReclaimed < 0 ||
    accountsClosed < 0
  ) {
    return jsonResponse({ error: 'Invalid body' }, 400, request, env);
  }

  // Synchronous KV updates (avoids race conditions with rapid requests)
  const [rawGlobal, rawWallet, rawRecent] = await Promise.all([
    env.STATS.get('stats:global'),
    env.STATS.get(`wallet:${wallet}`),
    env.STATS.get('stats:recent'),
  ]);

  const global: GlobalStats = rawGlobal
    ? JSON.parse(rawGlobal)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 };

  const walletStats: WalletStats = rawWallet
    ? JSON.parse(rawWallet)
    : { totalSolReclaimed: 0, totalAccountsClosed: 0, uses: 0 };

  const isNewWallet = walletStats.uses === 0;

  walletStats.totalSolReclaimed += solReclaimed;
  walletStats.totalAccountsClosed += accountsClosed;
  walletStats.uses += 1;

  global.totalSolReclaimed += solReclaimed;
  global.totalAccountsClosed += accountsClosed;
  if (isNewWallet) global.totalWallets += 1;

  const recent: RecentReclaim[] = rawRecent ? JSON.parse(rawRecent) : [];
  recent.unshift({
    wallet,
    solReclaimed,
    accountsClosed,
    timestamp: Date.now(),
  });
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;

  await Promise.all([
    env.STATS.put('stats:global', JSON.stringify(global)),
    env.STATS.put(`wallet:${wallet}`, JSON.stringify(walletStats)),
    env.STATS.put('stats:recent', JSON.stringify(recent)),
  ]);

  return jsonResponse({ ok: true }, 200, request, env);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    // Route: POST /api/rpc
    if (url.pathname === '/api/rpc' && request.method === 'POST') {
      return handleRpc(request, env);
    }

    // Route: GET /api/stats
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return handleGetStats(request, env);
    }

    // Route: POST /api/stats
    if (url.pathname === '/api/stats' && request.method === 'POST') {
      return handlePostStats(request, env);
    }

    // Route: GET /api/stats/recent
    if (url.pathname === '/api/stats/recent' && request.method === 'GET') {
      const raw = await env.STATS.get('stats:recent');
      const recent: RecentReclaim[] = raw ? JSON.parse(raw) : [];
      return jsonResponse(recent, 200, request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404, request, env);
  },
};
