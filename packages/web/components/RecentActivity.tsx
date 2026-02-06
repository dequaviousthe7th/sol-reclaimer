'use client';

import { FC, useState, useEffect, useRef } from 'react';

interface RecentReclaim {
  wallet: string;
  solReclaimed: number;
  accountsClosed: number;
  timestamp: number;
}

function truncateWallet(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
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

export const RecentActivity: FC = () => {
  const [reclaims, setReclaims] = useState<RecentReclaim[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return;

    fetch(`${workerUrl}/api/stats/recent`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: RecentReclaim[] | null) => {
        if (data && data.length > 0) {
          setReclaims(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (reclaims.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reclaims.length);
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [reclaims.length]);

  if (reclaims.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Recent Activity</p>
        <p className="text-sm text-gray-600">No activity yet</p>
      </div>
    );
  }

  const current = reclaims[activeIndex];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Recent Activity</p>
        <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse"></div>
      </div>
      <div className="min-h-[3.5rem] flex flex-col justify-center">
        <div key={activeIndex} className="modal-enter">
          <p className="text-sm text-white font-medium">
            <span className="text-solana-purple font-mono">{truncateWallet(current.wallet)}</span>
            {' '}reclaimed
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-lg font-bold text-solana-green">
              +{current.solReclaimed.toFixed(4)} SOL
            </span>
            <span className="text-xs text-gray-500">{timeAgo(current.timestamp)}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {current.accountsClosed} account{current.accountsClosed !== 1 ? 's' : ''} closed
          </p>
        </div>
      </div>
      {reclaims.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {reclaims.map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-colors ${
                i === activeIndex ? 'bg-solana-purple' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
