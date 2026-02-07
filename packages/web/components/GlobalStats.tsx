'use client';

import { FC, useState, useEffect } from 'react';

interface Stats {
  totalSolReclaimed: number;
  totalAccountsClosed: number;
  totalWallets: number;
}

export const GlobalStats: FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    fetch(`${workerUrl}/api/stats`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: Stats | null) => {
        if (data) setStats(data);
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="card p-5 h-[320px] flex flex-col">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Global Stats</p>

      {/* SOL Reclaimed - featured */}
      <div className="rounded-xl bg-gradient-to-br from-solana-green/10 to-solana-purple/5 border border-solana-green/15 p-4 text-center mb-4">
        <div className="text-3xl font-bold text-solana-green mb-0.5">{stats.totalSolReclaimed.toFixed(2)}</div>
        <div className="text-xs text-gray-400">SOL Reclaimed</div>
      </div>

      {/* Two stats side by side */}
      <div className="flex-1 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-[#0d0d0f] border border-[#1a1a1f] p-3 flex flex-col items-center justify-center">
          <svg className="w-5 h-5 text-solana-purple mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <div className="text-xl font-bold text-white">{stats.totalAccountsClosed.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Accounts Closed</div>
        </div>
        <div className="rounded-lg bg-[#0d0d0f] border border-[#1a1a1f] p-3 flex flex-col items-center justify-center">
          <svg className="w-5 h-5 text-solana-purple mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="text-xl font-bold text-white">{stats.totalWallets.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Wallets Served</div>
        </div>
      </div>
    </div>
  );
};
