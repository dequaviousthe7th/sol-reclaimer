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
    <div className="card p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Global Stats</p>
      <div className="space-y-3">
        <div>
          <div className="text-2xl font-bold text-solana-green">{stats.totalSolReclaimed.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-0.5">SOL Reclaimed</div>
        </div>
        <div className="w-full h-px bg-[#222228]"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-white">{stats.totalAccountsClosed.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Accounts Closed</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{stats.totalWallets.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Wallets</div>
          </div>
        </div>
      </div>
    </div>
  );
};
