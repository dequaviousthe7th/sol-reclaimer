'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';

interface GlobalStats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  totalWallets: number;
}

interface DailyViews {
  total: number;
  pages: Record<string, number>;
  countries: Record<string, number>;
}

interface DailyReclaims {
  count: number;
  sol: number;
  accounts: number;
}

interface DetailedReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  signatures: string[];
  timestamp: number;
}

interface AdminDashboardData {
  activeVisitors: number;
  globalStats: GlobalStats;
  todayViews: DailyViews;
  todayReclaims: DailyReclaims;
  weekReclaims: DailyReclaims;
  monthReclaims: DailyReclaims;
  socialClicks: Record<string, number>;
  recentReclaims: DetailedReclaim[];
}

interface ChartPoint {
  date: string;
  reclaims: number;
  sol: number;
  accounts: number;
  views: number;
}

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
}

type DashboardTab = 'overview' | 'settings';
type ChartMetric = 'reclaims' | 'sol' | 'views';

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 13);
  return toISODate(d);
}

function defaultEnd(): string {
  return toISODate(new Date());
}

interface TOTPSetupData {
  secret: string;
  uri: string;
  raw: string;
}

function truncateWallet(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function truncateSig(sig: string): string {
  if (sig.length <= 12) return sig;
  return `${sig.slice(0, 6)}...${sig.slice(-4)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const AdminDashboard: FC<AdminDashboardProps> = ({ token, onLogout }) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reclaimPage, setReclaimPage] = useState(1);
  const [reclaimData, setReclaimData] = useState<{
    items: DetailedReclaim[];
    total: number;
    totalPages: number;
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chart state
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartStart, setChartStart] = useState<string>(defaultStart);
  const [chartEnd, setChartEnd] = useState<string>(defaultEnd);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('reclaims');
  const [datePreset, setDatePreset] = useState<string>('14d');

  // Settings / TOTP state
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [totpSetupData, setTotpSetupData] = useState<TOTPSetupData | null>(null);
  const [totpConfirmCode, setTotpConfirmCode] = useState('');
  const [totpDisableCode, setTotpDisableCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [totpSuccess, setTotpSuccess] = useState<string | null>(null);

  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;

  const fetchDashboard = useCallback(async () => {
    if (!workerUrl) return;

    try {
      const res = await fetch(`${workerUrl}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json() as AdminDashboardData;
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    }

    setLoading(false);
  }, [workerUrl, token, onLogout]);

  const fetchReclaims = useCallback(async (page: number) => {
    if (!workerUrl) return;

    try {
      const res = await fetch(`${workerUrl}/api/admin/reclaims?page=${page}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) return;

      const json = await res.json() as {
        items: DetailedReclaim[];
        total: number;
        totalPages: number;
        page: number;
      };
      setReclaimData({ items: json.items, total: json.total, totalPages: json.totalPages });
    } catch {}
  }, [workerUrl, token]);

  const fetchChart = useCallback(async (start: string, end: string) => {
    if (!workerUrl) return;

    try {
      const res = await fetch(`${workerUrl}/api/admin/chart?start=${start}&end=${end}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) return;

      const json = await res.json() as ChartPoint[];
      setChartData(json);
    } catch {}
  }, [workerUrl, token]);

  const fetchTOTPStatus = useCallback(async () => {
    if (!workerUrl) return;
    try {
      const res = await fetch(`${workerUrl}/api/admin/totp/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json() as { enabled: boolean };
        setTotpEnabled(json.enabled);
      }
    } catch {}
  }, [workerUrl, token]);

  const startTOTPSetup = useCallback(async () => {
    if (!workerUrl) return;
    setTotpLoading(true);
    setTotpError(null);
    setTotpSuccess(null);

    try {
      const res = await fetch(`${workerUrl}/api/admin/totp/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setTotpError(d.error || 'Setup failed');
        setTotpLoading(false);
        return;
      }

      const json = await res.json() as TOTPSetupData;
      setTotpSetupData(json);
    } catch {
      setTotpError('Connection failed');
    }

    setTotpLoading(false);
  }, [workerUrl, token]);

  const confirmTOTP = useCallback(async () => {
    if (!workerUrl || !totpConfirmCode) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch(`${workerUrl}/api/admin/totp/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: totpConfirmCode }),
      });

      const json = await res.json() as { ok?: boolean; error?: string; message?: string };
      if (res.ok && json.ok) {
        setTotpEnabled(true);
        setTotpSetupData(null);
        setTotpConfirmCode('');
        setTotpSuccess('Authenticator enabled successfully');
      } else {
        setTotpError(json.error || 'Invalid code');
        setTotpConfirmCode('');
      }
    } catch {
      setTotpError('Connection failed');
    }

    setTotpLoading(false);
  }, [workerUrl, token, totpConfirmCode]);

  const disableTOTP = useCallback(async () => {
    if (!workerUrl || !totpDisableCode) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch(`${workerUrl}/api/admin/totp/disable`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ code: totpDisableCode }),
      });

      const json = await res.json() as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setTotpEnabled(false);
        setTotpDisableCode('');
        setTotpSuccess('Authenticator disabled');
      } else {
        setTotpError(json.error || 'Invalid code');
        setTotpDisableCode('');
      }
    } catch {
      setTotpError('Connection failed');
    }

    setTotpLoading(false);
  }, [workerUrl, token, totpDisableCode]);

  const handlePresetChange = useCallback((preset: string) => {
    setDatePreset(preset);
    if (preset === 'custom') return;
    const days = parseInt(preset, 10);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setChartStart(toISODate(start));
    setChartEnd(toISODate(end));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
    fetchReclaims(1);
    fetchChart(chartStart, chartEnd);
    fetchTOTPStatus();
  }, [fetchDashboard, fetchReclaims, fetchChart, chartStart, chartEnd, fetchTOTPStatus]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchDashboard();
        fetchChart(chartStart, chartEnd);
      }, 10_000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchDashboard, fetchChart, chartStart, chartEnd]);

  // Reclaim pagination
  useEffect(() => {
    fetchReclaims(reclaimPage);
  }, [reclaimPage, fetchReclaims]);

  // Refetch chart on date range change
  useEffect(() => {
    fetchChart(chartStart, chartEnd);
  }, [chartStart, chartEnd, fetchChart]);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
          </div>
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const d = data || {
    activeVisitors: 0,
    globalStats: { totalSolReclaimed: 0, totalAccountsClosed: 0, totalWallets: 0 },
    todayViews: { total: 0, pages: {}, countries: {} },
    todayReclaims: { count: 0, sol: 0, accounts: 0 },
    weekReclaims: { count: 0, sol: 0, accounts: 0 },
    monthReclaims: { count: 0, sol: 0, accounts: 0 },
    socialClicks: {},
    recentReclaims: [],
  };

  const sortedCountries = Object.entries(d.todayViews.countries)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <PriceProvider>
    <div className="min-h-screen flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111113]/90 backdrop-blur-md border-b border-[#222228]">
        <div className="px-6 lg:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">SolReclaimer</h1>
              <p className="text-[10px] text-gray-500">Admin Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex items-center bg-[#111113] rounded-lg border border-[#222228] overflow-hidden">
              <button
                onClick={() => setTab('overview')}
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  tab === 'overview'
                    ? 'bg-solana-purple/20 text-solana-purple'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => { setTab('settings'); setTotpError(null); setTotpSuccess(null); }}
                className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                  tab === 'settings'
                    ? 'bg-solana-purple/20 text-solana-purple'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                Settings
              </button>
            </div>

            {lastUpdated && (
              <span className="text-[10px] text-gray-600 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}

            {error && (
              <span className="text-[10px] text-red-400">Connection error</span>
            )}

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                autoRefresh
                  ? 'bg-solana-green/10 text-solana-green border border-solana-green/20'
                  : 'bg-[#111113] text-gray-500 border border-[#222228]'
              }`}
              title={autoRefresh ? 'Auto-refresh ON (10s)' : 'Auto-refresh OFF'}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-solana-green animate-pulse' : 'bg-gray-600'}`}></div>
                Live
              </div>
            </button>

            <button
              onClick={() => { fetchDashboard(); fetchReclaims(reclaimPage); fetchChart(chartStart, chartEnd); }}
              className="p-1.5 rounded-lg bg-[#111113] border border-[#222228] text-gray-400 hover:text-white transition-colors"
              title="Refresh now"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-10 pt-8 pb-8 flex-1">

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="max-w-lg mx-auto">
            <div className="card p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-solana-purple/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Two-Factor Authentication</h2>
                  <p className="text-[11px] text-gray-500">Authenticator app (TOTP)</p>
                </div>
                <div className="ml-auto">
                  {totpEnabled === null ? (
                    <span className="text-[10px] text-gray-600">Loading...</span>
                  ) : totpEnabled ? (
                    <span className="px-2 py-1 rounded-full bg-solana-green/10 text-solana-green text-[10px] font-semibold">Enabled</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-semibold">Disabled</span>
                  )}
                </div>
              </div>

              {totpSuccess && (
                <div className="mb-4 p-3 bg-solana-green/10 border border-solana-green/20 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-solana-green flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-solana-green text-xs">{totpSuccess}</p>
                </div>
              )}

              {totpError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-xs">{totpError}</p>
                </div>
              )}

              {totpEnabled === false && !totpSetupData && (
                <div>
                  <p className="text-xs text-gray-400 mb-4">
                    Add an extra layer of security by requiring a 6-digit code from your authenticator app
                    (Google Authenticator, Authy, 1Password, etc.) every time you log in.
                  </p>
                  <button
                    onClick={startTOTPSetup}
                    disabled={totpLoading}
                    className="btn-primary py-2.5 px-5 text-sm flex items-center justify-center gap-2"
                  >
                    {totpLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Set Up Authenticator
                      </>
                    )}
                  </button>
                </div>
              )}

              {totpSetupData && (
                <div>
                  <p className="text-xs text-gray-400 mb-4">
                    Open your authenticator app and add a new account. Scan the QR code or manually enter the secret key below.
                  </p>

                  <div className="mb-4">
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                      Manual Entry URI
                    </label>
                    <div className="bg-[#0d0d0f] border border-[#222228] rounded-lg p-3">
                      <code className="text-[11px] text-solana-purple break-all select-all">{totpSetupData.uri}</code>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                      Secret Key
                    </label>
                    <div className="bg-[#0d0d0f] border border-[#222228] rounded-lg p-3">
                      <code className="text-lg font-mono text-white tracking-[0.15em] select-all">{totpSetupData.secret}</code>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">Copy this into your authenticator app manually if you can&apos;t scan.</p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-1.5">
                      Verify Code
                    </label>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Enter the 6-digit code from your authenticator app to confirm setup.
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={totpConfirmCode}
                      onChange={(e) => setTotpConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full bg-[#0d0d0f] border border-[#222228] rounded-xl px-4 py-3 text-white text-xl font-mono text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-solana-purple/50 transition-colors"
                      autoComplete="one-time-code"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={confirmTOTP}
                      disabled={totpConfirmCode.length !== 6 || totpLoading}
                      className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                    >
                      {totpLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Verifying...
                        </>
                      ) : (
                        'Enable Authenticator'
                      )}
                    </button>
                    <button
                      onClick={() => { setTotpSetupData(null); setTotpConfirmCode(''); setTotpError(null); }}
                      className="px-4 py-2.5 rounded-xl bg-[#111113] border border-[#222228] text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {totpEnabled === true && !totpSetupData && (
                <div>
                  <p className="text-xs text-gray-400 mb-4">
                    Your account is protected with two-factor authentication. You&apos;ll need to enter a code from your
                    authenticator app every time you log in.
                  </p>

                  <div className="border-t border-[#1a1a1f] pt-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">Disable 2FA</p>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Enter your current authenticator code to disable two-factor authentication.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={totpDisableCode}
                        onChange={(e) => setTotpDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="flex-1 bg-[#0d0d0f] border border-[#222228] rounded-xl px-4 py-2.5 text-white text-sm font-mono text-center tracking-[0.3em] placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
                        autoComplete="one-time-code"
                      />
                      <button
                        onClick={disableTOTP}
                        disabled={totpDisableCode.length !== 6 || totpLoading}
                        className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {totpLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                        ) : (
                          'Disable'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Session</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-400">Status</span>
                  <span className="text-xs text-solana-green font-medium">Authenticated</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-gray-400">Storage</span>
                  <span className="text-xs text-gray-300">Session only (clears on tab close)</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="w-full mt-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {tab === 'overview' && (
        <>
        {/* Stats Grid — full width, all uniform with green edge */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="stat-card !border-solana-green/30">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse"></div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Active Now</p>
            </div>
            <p className="text-2xl font-bold text-white">{d.activeVisitors}</p>
          </div>

          <div className="stat-card !border-solana-green/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Today Reclaims</p>
            <p className="text-2xl font-bold text-white">{d.todayReclaims.count}</p>
          </div>

          <div className="stat-card !border-solana-green/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Today SOL</p>
            <p className="text-2xl font-bold text-white">{d.todayReclaims.sol.toFixed(3)}</p>
          </div>

          <div className="stat-card !border-solana-green/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">This Week</p>
            <p className="text-2xl font-bold text-white">{d.weekReclaims.count}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{d.weekReclaims.sol.toFixed(3)} SOL</p>
          </div>

          <div className="stat-card !border-solana-green/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">This Month</p>
            <p className="text-2xl font-bold text-white">{d.monthReclaims.sol.toFixed(3)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{d.monthReclaims.count} reclaims</p>
          </div>

          <div className="stat-card !border-solana-green/30">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">All Time</p>
            <p className="text-2xl font-bold text-white">{d.globalStats.totalSolReclaimed.toFixed(2)}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{d.globalStats.totalWallets} wallets</p>
          </div>
        </div>

        {/* Main content: two-column layout on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left column — chart + activity table (2/3 width) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Chart */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Activity Chart</p>

                <div className="flex items-center gap-2">
                  {/* Metric selector */}
                  <div className="flex items-center bg-[#0d0d0f] rounded-lg border border-[#1a1a1f] overflow-hidden">
                    {(['reclaims', 'sol', 'views'] as ChartMetric[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setChartMetric(m)}
                        className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                          chartMetric === m
                            ? 'bg-solana-green/15 text-solana-green'
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {m === 'reclaims' ? 'Reclaims' : m === 'sol' ? 'SOL' : 'Views'}
                      </button>
                    ))}
                  </div>

                  {/* Date range dropdown */}
                  <select
                    value={datePreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-lg px-2.5 py-1 text-[10px] text-gray-300 font-medium focus:outline-none focus:border-solana-purple/40 transition-colors [color-scheme:dark] cursor-pointer appearance-none pr-6"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' fill=\'%23666\'%3E%3Cpath d=\'M0 0l5 6 5-6z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                  >
                    <option value="1d">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="14d">Last 14 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="custom">Custom range</option>
                  </select>
                  {datePreset === 'custom' && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={chartStart}
                        max={chartEnd}
                        onChange={(e) => setChartStart(e.target.value)}
                        className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-lg px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-solana-purple/40 transition-colors [color-scheme:dark]"
                      />
                      <span className="text-[10px] text-gray-600">to</span>
                      <input
                        type="date"
                        value={chartEnd}
                        min={chartStart}
                        max={toISODate(new Date())}
                        onChange={(e) => setChartEnd(e.target.value)}
                        className="bg-[#0d0d0f] border border-[#1a1a1f] rounded-lg px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-solana-purple/40 transition-colors [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>
              </div>

              <BarChart data={chartData} metric={chartMetric} />
            </div>

            {/* Reclaim Activity Table */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Reclaim Activity</p>
                  <div className="w-1.5 h-1.5 rounded-full bg-solana-green animate-pulse"></div>
                </div>
                {reclaimData && (
                  <span className="text-[10px] text-gray-600">{reclaimData.total} total</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1f]">
                      <th className="text-left text-[10px] text-gray-500 uppercase tracking-wide font-medium py-2 pr-4">Time</th>
                      <th className="text-left text-[10px] text-gray-500 uppercase tracking-wide font-medium py-2 pr-4">Wallet</th>
                      <th className="text-right text-[10px] text-gray-500 uppercase tracking-wide font-medium py-2 pr-4">SOL</th>
                      <th className="text-right text-[10px] text-gray-500 uppercase tracking-wide font-medium py-2 pr-4">Accounts</th>
                      <th className="text-left text-[10px] text-gray-500 uppercase tracking-wide font-medium py-2">Signatures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reclaimData?.items || d.recentReclaims).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-600 text-sm">
                          No reclaims recorded yet
                        </td>
                      </tr>
                    ) : (
                      (reclaimData?.items || d.recentReclaims).map((r, i) => (
                        <tr
                          key={`${r.wallet}-${r.timestamp}-${i}`}
                          className="border-b border-[#111113] hover:bg-[#111113]/50 transition-colors"
                        >
                          <td className="py-2.5 pr-4 whitespace-nowrap">
                            <span className="text-gray-400 text-xs" title={formatTimestamp(r.timestamp)}>
                              {timeAgo(r.timestamp)}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <a
                              href={`https://solscan.io/account/${r.wallet}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-solana-purple hover:text-solana-green transition-colors text-xs"
                              title={r.wallet}
                            >
                              {truncateWallet(r.wallet)}
                            </a>
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            <span className="text-solana-green font-semibold text-xs">+{r.solReclaimed.toFixed(4)}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            <span className="text-gray-300 text-xs">{r.accountsClosed}</span>
                          </td>
                          <td className="py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {r.signatures.length > 0 ? r.signatures.slice(0, 3).map((sig, j) => (
                                <a
                                  key={j}
                                  href={`https://solscan.io/tx/${sig}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[10px] text-solana-purple/70 hover:text-solana-green transition-colors bg-solana-purple/5 px-1.5 py-0.5 rounded"
                                  title={sig}
                                >
                                  {truncateSig(sig)}
                                </a>
                              )) : (
                                <span className="text-[10px] text-gray-600">-</span>
                              )}
                              {r.signatures.length > 3 && (
                                <span className="text-[10px] text-gray-600">+{r.signatures.length - 3}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {reclaimData && reclaimData.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1a1a1f]">
                  <button
                    onClick={() => setReclaimPage(Math.max(1, reclaimPage - 1))}
                    disabled={reclaimPage <= 1}
                    className="px-3 py-1.5 rounded-lg bg-[#0d0d0f] border border-[#222228] text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-[10px] text-gray-500">
                    Page {reclaimPage} of {reclaimData.totalPages}
                  </span>
                  <button
                    onClick={() => setReclaimPage(Math.min(reclaimData.totalPages, reclaimPage + 1))}
                    disabled={reclaimPage >= reclaimData.totalPages}
                    className="px-3 py-1.5 rounded-lg bg-[#0d0d0f] border border-[#222228] text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right column — sidebar widgets (1/3 width) */}
          <div className="space-y-6">
            {/* Page Views */}
            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Page Views</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-[#0d0d0f] border border-[#1a1a1f] p-3 text-center">
                  <p className="text-xl font-bold text-white">{d.todayViews.total.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Today</p>
                </div>
                <div className="rounded-lg bg-[#0d0d0f] border border-[#1a1a1f] p-3 text-center">
                  <p className="text-xl font-bold text-white">{d.globalStats.totalAccountsClosed.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Total Accounts</p>
                </div>
              </div>

              {sortedCountries.length > 0 && (
                <>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">Top Countries</p>
                  <div className="space-y-1.5">
                    {sortedCountries.map(([country, count]) => {
                      const pct = d.todayViews.total > 0 ? (count / d.todayViews.total) * 100 : 0;
                      return (
                        <div key={country} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-6 font-mono">{country}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#0d0d0f] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-green"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Social Engagement */}
            <div className="card p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Social Engagement</p>

              <div className="space-y-3">
                <SocialRow
                  icon={
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  }
                  label="GitHub"
                  count={d.socialClicks.github || 0}
                />
                <SocialRow
                  icon={
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  }
                  label="X Profile"
                  count={d.socialClicks.x || 0}
                />
                <SocialRow
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  }
                  label="Share on X"
                  count={d.socialClicks['share-x'] || 0}
                />
                <SocialRow
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  label="Built-by Link"
                  count={d.socialClicks['built-by'] || 0}
                />
              </div>

              <div className="mt-5 pt-4 border-t border-[#1a1a1f]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#0d0d0f] border border-[#1a1a1f] p-3 text-center">
                    <p className="text-lg font-bold text-solana-purple">
                      {Object.values(d.socialClicks).reduce((a, b) => a + b, 0)}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Total Clicks</p>
                  </div>
                  <div className="rounded-lg bg-[#0d0d0f] border border-[#1a1a1f] p-3 text-center">
                    <p className="text-lg font-bold text-white">{d.globalStats.totalWallets.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Unique Wallets</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
        </>
        )}
      </div>

      {/* Footer */}
      <footer className="pt-3 pb-3 border-t border-[#222228]">
        <div className="px-6 lg:px-10 flex items-center justify-between text-[11px] text-gray-500">
          <BtcPrice />
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <a
              href="https://github.com/dequaviousthe7th/sol-reclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
              title="View on GitHub"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <a
              href="https://x.com/SolanaReclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
              title="Follow on X"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <span className="text-gray-700">&middot;</span>
            <span className="text-[10px]">Built by <a
              href="https://x.com/dequavious7th"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-solana-purple transition-colors"
            >Dequavious</a></span>
          </div>
          <SolPrice />
        </div>
      </footer>
    </div>
    </PriceProvider>
  );
};

// ──────────────────────────────────────────────
// Bar Chart (pure SVG, no deps)
// ──────────────────────────────────────────────

function BarChart({ data, metric }: { data: ChartPoint[]; metric: ChartMetric }) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
        No chart data available
      </div>
    );
  }

  const values = data.map((p) =>
    metric === 'reclaims' ? p.reclaims : metric === 'sol' ? p.sol : p.views
  );
  const maxVal = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);

  const chartH = 180;
  const barGap = 3;
  const barW = Math.max(8, Math.floor((700 - data.length * barGap) / data.length));
  const chartW = data.length * (barW + barGap);

  // Show every Nth label to avoid overlap
  const labelEvery = data.length <= 14 ? 1 : data.length <= 21 ? 2 : 3;

  return (
    <div>
      {/* Summary line */}
      <div className="flex items-center gap-4 mb-3">
        <span className="text-lg font-bold text-white">
          {metric === 'sol' ? total.toFixed(3) : total.toLocaleString()}
        </span>
        <span className="text-[10px] text-gray-500">
          total {metric === 'reclaims' ? 'reclaims' : metric === 'sol' ? 'SOL reclaimed' : 'page views'} in {data.length} day{data.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH + 28}`}
          className="w-full"
          style={{ minWidth: Math.max(chartW, 300) }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((pct) => (
            <line
              key={pct}
              x1={0}
              y1={chartH - chartH * pct}
              x2={chartW}
              y2={chartH - chartH * pct}
              stroke="#1a1a1f"
              strokeWidth={0.5}
            />
          ))}

          {/* Bars */}
          {data.map((point, i) => {
            const val = metric === 'reclaims' ? point.reclaims : metric === 'sol' ? point.sol : point.views;
            const barH = val > 0 ? Math.max((val / maxVal) * chartH, 4) : 2;
            const barY = chartH - barH;
            const x = i * (barW + barGap);

            return (
              <g key={point.date}>
                {/* Bar */}
                <rect
                  x={x}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx={barW > 10 ? 3 : 2}
                  fill={val > 0 ? 'url(#barGradient)' : '#1a1a1f'}
                >
                  <title>{formatDateLabel(point.date)}: {metric === 'sol' ? val.toFixed(4) : val}</title>
                </rect>

                {/* Value label above bar */}
                {val > 0 && barH > 20 && (
                  <text
                    x={x + barW / 2}
                    y={barY + 14}
                    textAnchor="middle"
                    fill="white"
                    fontSize={barW > 20 ? 10 : 8}
                    fontWeight={600}
                    opacity={0.9}
                  >
                    {metric === 'sol' ? val.toFixed(2) : val}
                  </text>
                )}

                {/* Date label */}
                {i % labelEvery === 0 && (
                  <text
                    x={x + barW / 2}
                    y={chartH + 16}
                    textAnchor="middle"
                    fill="#555"
                    fontSize={barW > 20 ? 9 : 8}
                  >
                    {formatDateLabel(point.date)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14F195" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#9945FF" stopOpacity={0.6} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

function SocialRow({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0d0d0f] border border-[#1a1a1f]">
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{icon}</span>
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{count.toLocaleString()}</span>
    </div>
  );
}
