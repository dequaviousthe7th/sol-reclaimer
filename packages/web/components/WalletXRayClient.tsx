'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import('./TradingChart'), { ssr: false });

/* ─── Types ─── */

interface WalletXRayToken {
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  invested: number;
  pnl: number;
  realized: number;
  unrealized: number;
  pnlPercent: number;
  trades: number;
  buyTxns: number;
  sellTxns: number;
  holding: boolean;
  currentValue: number;
  totalSold: number;
  lastTradeTime: number;
}

interface WalletXRayResult {
  wallet: string;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalInvested: number;
  winRate: number;
  wins: number;
  losses: number;
  grade: string;
  tokens: WalletXRayToken[];
}

type State = 'idle' | 'loading' | 'results' | 'error';
type Tab = 'top' | 'active' | 'history' | 'activity';
type SortDir = 'asc' | 'desc';

interface SortState {
  key: string;
  dir: SortDir;
}

/* ─── Helpers ─── */

const isValidBase58 = (str: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(str);

function formatSol(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function formatSolWithUnit(n: number): string {
  return `${formatSol(n)} SOL`;
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function formatPnl(n: number): string {
  return `${n >= 0 ? '+' : ''}${formatSol(n)} SOL`;
}

function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts * 1000;
  if (diff < 0) return 'Just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatUsd(solAmount: number, solPrice: number): string {
  if (!solPrice) return '';
  const usd = solAmount * solPrice;
  const abs = Math.abs(usd);
  const sign = usd < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function pnlColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-gray-400';
}

function gradeGradient(grade: string): string {
  const g = grade.toUpperCase().replace('+', '+');
  if (g === 'A+' || g === 'A') return 'from-emerald-500 to-green-500';
  if (g.startsWith('B')) return 'from-cyan-500 to-blue-500';
  if (g.startsWith('C')) return 'from-yellow-500 to-amber-500';
  if (g.startsWith('D')) return 'from-orange-500 to-red-500';
  return 'from-red-600 to-red-800';
}

function gradeGlow(grade: string): string {
  const g = grade.toUpperCase().replace('+', '+');
  if (g === 'A+' || g === 'A') return 'shadow-[0_0_40px_rgba(16,185,129,0.25)]';
  if (g.startsWith('B')) return 'shadow-[0_0_40px_rgba(6,182,212,0.25)]';
  if (g.startsWith('C')) return 'shadow-[0_0_40px_rgba(245,158,11,0.25)]';
  if (g.startsWith('D')) return 'shadow-[0_0_40px_rgba(249,115,22,0.25)]';
  return 'shadow-[0_0_40px_rgba(239,68,68,0.25)]';
}

function truncateWallet(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function sortTokens<T extends WalletXRayToken>(tokens: T[], key: string, dir: SortDir): T[] {
  const sorted = [...tokens];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'invested': cmp = a.invested - b.invested; break;
      case 'pnl': cmp = a.pnl - b.pnl; break;
      case 'absPnl': cmp = Math.abs(a.pnl) - Math.abs(b.pnl); break;
      case 'pnlPercent': cmp = a.pnlPercent - b.pnlPercent; break;
      case 'roi': cmp = a.pnlPercent - b.pnlPercent; break;
      case 'trades': cmp = a.trades - b.trades; break;
      case 'currentValue': cmp = a.currentValue - b.currentValue; break;
      case 'unrealized': cmp = a.unrealized - b.unrealized; break;
      case 'realized': cmp = a.realized - b.realized; break;
      case 'totalSold': cmp = a.totalSold - b.totalSold; break;
      case 'lastTradeTime': cmp = a.lastTradeTime - b.lastTradeTime; break;
      default: cmp = 0;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

/* ─── Sub-components ─── */

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-gray-700">&uarr;</span>;
  return <span className="ml-1 text-amber-400">{dir === 'asc' ? '\u2191' : '\u2193'}</span>;
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'right',
}: {
  label: string;
  sortKey: string;
  currentSort: SortState;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
}) {
  return (
    <th className={`px-3 sm:px-4 py-3 ${align === 'left' ? 'text-left' : 'text-right'}`}>
      <button
        onClick={() => onSort(sortKey)}
        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
      >
        {label}
        <SortArrow active={currentSort.key === sortKey} dir={currentSort.dir} />
      </button>
    </th>
  );
}

function TokenCell({ token }: { token: WalletXRayToken }) {
  return (
    <div className="flex items-center gap-2.5">
      {token.imageUrl ? (
        <img
          src={token.imageUrl}
          alt=""
          className="w-7 h-7 rounded-lg flex-shrink-0 bg-[#1a1a1e]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-7 h-7 rounded-lg bg-[#1a1a1e] flex items-center justify-center text-gray-600 flex-shrink-0">
          <span className="text-[10px] font-bold">{token.symbol.slice(0, 2)}</span>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-medium truncate max-w-[100px] sm:max-w-[140px]">
            {token.symbol}
          </span>
          {token.holding && (
            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500/15 text-amber-400 rounded border border-amber-500/20">
              HOLD
            </span>
          )}
        </div>
        <p className="text-gray-600 text-[10px] truncate max-w-[100px] sm:max-w-[140px]">{token.name}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[#1a1a1e] flex items-center justify-center mx-auto mb-3">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-7 h-7 rounded-lg bg-[#1a1a1e] shimmer" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 bg-[#1a1a1e] rounded shimmer" />
        <div className="h-2 w-16 bg-[#1a1a1e] rounded shimmer" />
      </div>
      <div className="h-3 w-16 bg-[#1a1a1e] rounded shimmer" />
      <div className="hidden sm:block h-3 w-14 bg-[#1a1a1e] rounded shimmer" />
      <div className="hidden sm:block h-3 w-12 bg-[#1a1a1e] rounded shimmer" />
    </div>
  );
}

/* ─── Main Component ─── */

export default function WalletXRayClient() {
  const [state, setState] = useState<State>('idle');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<WalletXRayResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('top');
  const [chartData, setChartData] = useState<{time:number;value:number}[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [solPrice, setSolPrice] = useState(0);

  // Per-tab sort states
  const [topSort, setTopSort] = useState<SortState>({ key: 'absPnl', dir: 'desc' });
  const [activeSort, setActiveSort] = useState<SortState>({ key: 'unrealized', dir: 'desc' });
  const [historySort, setHistorySort] = useState<SortState>({ key: 'realized', dir: 'desc' });
  const [activitySort, setActivitySort] = useState<SortState>({ key: 'lastTradeTime', dir: 'desc' });

  // Fetch SOL price on mount
  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;
    fetch(`${workerUrl}/api/prices`).then(r => r.json())
      .then((d: Record<string, Record<string, number>>) => { if (d?.solana?.usd) setSolPrice(d.solana.usd); }).catch(() => {});
  }, []);

  const analyze = useCallback(async () => {
    const wallet = input.trim();
    if (!isValidBase58(wallet)) return;

    setState('loading');
    setError('');
    setChartData([]);
    setChartLoading(true);

    try {
      const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
      if (!workerUrl) throw new Error('API not configured');

      // Fire chart fetch in parallel (non-blocking)
      fetch(`${workerUrl}/api/wallet-chart?wallet=${wallet}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: { chartData?: Array<{ timestamp: number; value: number }> } | null) => {
          if (d?.chartData) {
            setChartData(d.chartData.map(p => ({
              time: Math.floor(p.timestamp / 1000),
              value: p.value,
            })));
          }
        })
        .catch(() => {})
        .finally(() => setChartLoading(false));

      const res = await fetch(`${workerUrl}/api/wallet-xray?wallet=${wallet}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error((data as { error?: string }).error || `Error ${res.status}`);
      }

      const data = await res.json() as WalletXRayResult;
      setResult(data);
      setActiveTab('top');
      setTopSort({ key: 'absPnl', dir: 'desc' });
      setActiveSort({ key: 'unrealized', dir: 'desc' });
      setHistorySort({ key: 'realized', dir: 'desc' });
      setActivitySort({ key: 'lastTradeTime', dir: 'desc' });
      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setState('error');
    }
  }, [input]);

  const reset = useCallback(() => {
    setState('idle');
    setInput('');
    setResult(null);
    setError('');
    setChartData([]);
    setChartLoading(false);
  }, []);

  const toggleSort = useCallback((
    current: SortState,
    setter: (s: SortState) => void,
    key: string,
  ) => {
    if (current.key === key) {
      setter({ key, dir: current.dir === 'desc' ? 'asc' : 'desc' });
    } else {
      setter({ key, dir: 'desc' });
    }
  }, []);

  // Filtered + sorted token lists per tab
  const topTokens = useMemo(() => {
    if (!result) return [];
    return sortTokens(result.tokens, topSort.key, topSort.dir);
  }, [result, topSort]);

  const activeTokens = useMemo(() => {
    if (!result) return [];
    const filtered = result.tokens.filter(t => t.holding);
    return sortTokens(filtered, activeSort.key, activeSort.dir);
  }, [result, activeSort]);

  const historyTokens = useMemo(() => {
    if (!result) return [];
    const filtered = result.tokens.filter(t => !t.holding);
    return sortTokens(filtered, historySort.key, historySort.dir);
  }, [result, historySort]);

  const activityTokens = useMemo(() => {
    if (!result) return [];
    return sortTokens(result.tokens, activitySort.key, activitySort.dir);
  }, [result, activitySort]);

  /* ──────────────────── IDLE STATE ──────────────────── */

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16">
        {/* Floating animated eye icon */}
        <div className="float mb-6 relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 relative overflow-hidden">
            <div className="absolute inset-0 shimmer" />
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          {/* Glow ring */}
          <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-xl -z-10 pulse-glow" style={{ boxShadow: '0 0 30px rgba(245,158,11,0.2)' }} />
        </div>

        {/* Headline */}
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
          X-Ray Any Wallet
        </h2>
        <p className="text-gray-400 text-sm sm:text-base mb-8 text-center max-w-md leading-relaxed">
          Uncover any trader&apos;s full performance history, win rate, PnL breakdown, and trading grade.
        </p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mb-8">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              ),
              title: 'Trader Grade',
              desc: 'A+ to F rating based on performance',
              color: 'text-amber-400',
              border: 'border-amber-500/10 hover:border-amber-500/30',
              bg: 'bg-amber-500/5',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
              title: 'PnL Breakdown',
              desc: 'Realized vs unrealized profit/loss',
              color: 'text-green-400',
              border: 'border-green-500/10 hover:border-green-500/30',
              bg: 'bg-green-500/5',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              title: 'Token History',
              desc: 'Per-token performance & trade details',
              color: 'text-purple-400',
              border: 'border-purple-500/10 hover:border-purple-500/30',
              bg: 'bg-purple-500/5',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className={`card card-hover p-4 text-center ${feature.border} transition-all duration-300`}
            >
              <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mx-auto mb-2.5 ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="text-white text-sm font-semibold mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="w-full max-w-lg">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && isValidBase58(input.trim()) && analyze()}
              placeholder="Enter any wallet address..."
              className="flex-1 bg-[#111113] border border-[#222228] rounded-xl px-4 py-3.5 text-sm text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 focus:shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-all"
              spellCheck={false}
            />
            <button
              onClick={analyze}
              disabled={!isValidBase58(input.trim())}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-all"
            >
              Analyze
            </button>
          </div>
          <p className="text-gray-600 text-xs text-center mt-3">
            No wallet connection needed
          </p>
        </div>
      </div>
    );
  }

  /* ──────────────────── LOADING STATE ──────────────────── */

  if (state === 'loading') {
    return (
      <div className="py-10 space-y-4">
        {/* Spinner hero */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-14 h-14 mb-5">
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-orange-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-white text-sm font-medium mb-1">Analyzing wallet...</p>
          <p className="text-gray-600 text-xs font-mono">{truncateWallet(input.trim())}</p>
        </div>

        {/* Skeleton cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-2.5 w-16 bg-[#1a1a1e] rounded shimmer mb-3" />
              <div className="h-5 w-20 bg-[#1a1a1e] rounded shimmer" />
            </div>
          ))}
        </div>

        {/* Skeleton table */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#222228]">
            <div className="h-3 w-24 bg-[#1a1a1e] rounded shimmer" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  /* ──────────────────── ERROR STATE ──────────────────── */

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="card max-w-md w-full overflow-hidden">
          {/* Red accent bar */}
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600" />

          <div className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h3 className="text-white font-semibold text-base mb-2">Analysis Failed</h3>
            <p className="text-red-400/90 text-sm mb-6 leading-relaxed">{error}</p>

            <button
              onClick={() => { setState('idle'); setError(''); }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-red-300 text-sm font-medium hover:border-red-500/50 hover:text-red-200 transition-all"
            >
              Try Again
            </button>

            <p className="text-gray-600 text-xs mt-4">
              Make sure the wallet address is valid and try again
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ──────────────────── RESULTS STATE ──────────────────── */

  if (!result) return null;

  const winRatePct = Math.min(100, Math.max(0, result.winRate));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'top', label: 'Top Trades', count: result.tokens.length },
    { key: 'active', label: 'Active', count: result.tokens.filter(t => t.holding).length },
    { key: 'history', label: 'History', count: result.tokens.filter(t => !t.holding).length },
    { key: 'activity', label: 'Activity', count: result.tokens.length },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-6 stats-enter">

      {/* ── Hero Section ── */}
      <div className="card p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute inset-0 shimmer opacity-40" />

        <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-6">
          {/* Grade Card */}
          <div className="flex sm:flex-col items-center sm:items-center gap-4 sm:gap-2">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${gradeGradient(result.grade)} flex items-center justify-center flex-shrink-0 ${gradeGlow(result.grade)}`}>
              <span className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">{result.grade}</span>
            </div>
            <div className="sm:text-center">
              <p className="text-gray-400 text-xs uppercase tracking-wider font-medium">Trader Grade</p>
              <p className="text-gray-600 text-[10px] mt-0.5 font-mono sm:hidden">{truncateWallet(result.wallet)}</p>
            </div>
          </div>

          {/* Stats Area */}
          <div className="flex-1 flex flex-col justify-center gap-3 sm:gap-4">
            {/* Total PnL */}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total PnL</p>
              <p className={`text-2xl sm:text-3xl font-bold ${pnlColor(result.totalPnl)}`}>
                {result.totalPnl >= 0 ? '+' : ''}{formatSolWithUnit(result.totalPnl)}
                {solPrice > 0 && (
                  <span className="text-gray-500 text-sm font-normal ml-2">
                    (~{formatUsd(result.totalPnl, solPrice)})
                  </span>
                )}
              </p>
            </div>

            {/* Win Rate Bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Win Rate</p>
                <p className="text-white text-sm font-semibold">{winRatePct.toFixed(1)}%</p>
              </div>
              <div className="h-2.5 bg-red-500/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-700"
                  style={{ width: `${winRatePct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-green-400/70 text-[10px]">{result.wins}W</span>
                <span className="text-red-400/70 text-[10px]">{result.losses}L</span>
              </div>
            </div>

            {/* Total Invested */}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">Total Invested</p>
              <p className="text-white text-base font-semibold">{formatSolWithUnit(result.totalInvested)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PnL Chart ── */}
      {(chartLoading || chartData.length > 0) && (
        <TradingChart
          type="area"
          data={chartData}
          height={280}
          mobileHeight={200}
          color={result.totalPnl >= 0 ? 'green' : 'red'}
          loading={chartLoading}
          ranges={[
            { label: '7D', seconds: 604800 },
            { label: '30D', seconds: 2592000 },
            { label: 'Max', seconds: 0 },
          ]}
        />
      )}

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500/50" />
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Realized PnL</p>
          </div>
          <p className={`text-sm sm:text-base font-bold ${pnlColor(result.realizedPnl)}`}>
            {result.realizedPnl >= 0 ? '+' : ''}{formatSolWithUnit(result.realizedPnl)}
          </p>
          {solPrice > 0 && (
            <p className="text-gray-600 text-[10px] mt-0.5">{formatUsd(result.realizedPnl, solPrice)}</p>
          )}
        </div>

        <div className="stat-card group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500/50" />
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Unrealized PnL</p>
          </div>
          <p className={`text-sm sm:text-base font-bold ${pnlColor(result.unrealizedPnl)}`}>
            {result.unrealizedPnl >= 0 ? '+' : ''}{formatSolWithUnit(result.unrealizedPnl)}
          </p>
          {solPrice > 0 && (
            <p className="text-gray-600 text-[10px] mt-0.5">{formatUsd(result.unrealizedPnl, solPrice)}</p>
          )}
        </div>

        <div className="stat-card group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Wins</p>
          </div>
          <p className="text-sm sm:text-base font-bold text-green-400">{result.wins}</p>
        </div>

        <div className="stat-card group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Losses</p>
          </div>
          <p className="text-sm sm:text-base font-bold text-red-400">{result.losses}</p>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-[#111113] border border-[#222228] text-gray-400 hover:text-white hover:border-[#333]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="card overflow-hidden">
        {/* TOP TRADES TAB */}
        {activeTab === 'top' && (
          topTokens.length === 0 ? (
            <EmptyState message="No token trades found for this wallet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222228]">
                    <SortableHeader label="Token" sortKey="symbol" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} align="left" />
                    <SortableHeader label="Invested" sortKey="invested" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} />
                    <SortableHeader label="PnL" sortKey="pnl" currentSort={topSort} onSort={(k) => toggleSort(topSort, setTopSort, k)} />
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => toggleSort(topSort, setTopSort, 'pnlPercent')}
                        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
                      >
                        ROI
                        <SortArrow active={topSort.key === 'pnlPercent'} dir={topSort.dir} />
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => toggleSort(topSort, setTopSort, 'trades')}
                        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
                      >
                        Trades
                        <SortArrow active={topSort.key === 'trades'} dir={topSort.dir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topTokens.map(token => (
                    <tr key={token.mint} className="border-b border-[#222228]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 sm:px-4 py-2.5">
                        <TokenCell token={token} />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className="text-gray-300 text-xs">{formatSol(token.invested)} SOL</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium ${pnlColor(token.pnl)}`}>
                          {formatPnl(token.pnl)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className={`text-xs ${pnlColor(token.pnlPercent)}`}>
                          {formatPct(token.pnlPercent)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className="text-gray-400 text-xs">{token.trades}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ACTIVE POSITIONS TAB */}
        {activeTab === 'active' && (
          activeTokens.length === 0 ? (
            <EmptyState message="No active positions found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222228]">
                    <SortableHeader label="Token" sortKey="symbol" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} align="left" />
                    <SortableHeader label="Invested" sortKey="invested" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} />
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => toggleSort(activeSort, setActiveSort, 'currentValue')}
                        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
                      >
                        Value
                        <SortArrow active={activeSort.key === 'currentValue'} dir={activeSort.dir} />
                      </button>
                    </th>
                    <SortableHeader label="Unrealized" sortKey="unrealized" currentSort={activeSort} onSort={(k) => toggleSort(activeSort, setActiveSort, k)} />
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => toggleSort(activeSort, setActiveSort, 'pnlPercent')}
                        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
                      >
                        ROI
                        <SortArrow active={activeSort.key === 'pnlPercent'} dir={activeSort.dir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeTokens.map(token => (
                    <tr key={token.mint} className="border-b border-[#222228]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 sm:px-4 py-2.5">
                        <TokenCell token={token} />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className="text-gray-300 text-xs">{formatSol(token.invested)} SOL</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className="text-white text-xs font-medium">{formatSol(token.currentValue)} SOL</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium ${pnlColor(token.unrealized)}`}>
                          {token.unrealized >= 0 ? '+' : ''}{formatSol(token.unrealized)} SOL
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className={`text-xs ${pnlColor(token.pnlPercent)}`}>
                          {formatPct(token.pnlPercent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          historyTokens.length === 0 ? (
            <EmptyState message="No completed trades found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222228]">
                    <SortableHeader label="Token" sortKey="symbol" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} align="left" />
                    <SortableHeader label="Bought" sortKey="invested" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} />
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => toggleSort(historySort, setHistorySort, 'totalSold')}
                        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
                      >
                        Sold
                        <SortArrow active={historySort.key === 'totalSold'} dir={historySort.dir} />
                      </button>
                    </th>
                    <SortableHeader label="Profit" sortKey="realized" currentSort={historySort} onSort={(k) => toggleSort(historySort, setHistorySort, k)} />
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <button
                        onClick={() => toggleSort(historySort, setHistorySort, 'pnlPercent')}
                        className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap inline-flex items-center"
                      >
                        ROI
                        <SortArrow active={historySort.key === 'pnlPercent'} dir={historySort.dir} />
                      </button>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-right hidden lg:table-cell">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Buys/Sells</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyTokens.map(token => (
                    <tr key={token.mint} className="border-b border-[#222228]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 sm:px-4 py-2.5">
                        <TokenCell token={token} />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className="text-gray-300 text-xs">{formatSol(token.invested)} SOL</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className="text-gray-300 text-xs">{formatSol(token.totalSold)} SOL</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium ${pnlColor(token.realized)}`}>
                          {token.realized >= 0 ? '+' : ''}{formatSol(token.realized)} SOL
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className={`text-xs ${pnlColor(token.pnlPercent)}`}>
                          {formatPct(token.pnlPercent)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden lg:table-cell">
                        <span className="text-gray-400 text-xs">
                          <span className="text-green-400/70">{token.buyTxns}</span>
                          <span className="text-gray-600 mx-0.5">/</span>
                          <span className="text-red-400/70">{token.sellTxns}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          activityTokens.length === 0 ? (
            <EmptyState message="No trading activity found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#222228]">
                    <SortableHeader label="Token" sortKey="symbol" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} align="left" />
                    <SortableHeader label="Last Trade" sortKey="lastTradeTime" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} />
                    <th className="px-3 sm:px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">Type</span>
                    </th>
                    <SortableHeader label="PnL" sortKey="pnl" currentSort={activitySort} onSort={(k) => toggleSort(activitySort, setActivitySort, k)} />
                  </tr>
                </thead>
                <tbody>
                  {activityTokens.map(token => (
                    <tr key={token.mint} className="border-b border-[#222228]/40 hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 sm:px-4 py-2.5">
                        <TokenCell token={token} />
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <span className="text-gray-400 text-xs">{relativeTime(token.lastTradeTime)}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right hidden sm:table-cell">
                        <span className="text-xs">
                          <span className="text-green-400/70">{token.buyTxns}B</span>
                          <span className="text-gray-600 mx-0.5">/</span>
                          <span className="text-red-400/70">{token.sellTxns}S</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-xs font-medium ${pnlColor(token.pnl)}`}>
                            {formatPnl(token.pnl)}
                          </span>
                          {token.holding && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500/15 text-amber-400 rounded border border-amber-500/20">
                              HOLD
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Analyze Another ── */}
      <div className="text-center pt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#222228] text-gray-400 text-sm hover:text-amber-400 hover:border-amber-500/30 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Analyze another wallet
        </button>
      </div>
    </div>
  );
}
