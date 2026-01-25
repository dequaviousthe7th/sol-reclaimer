'use client';

import { FC } from 'react';

interface TransactionProgressProps {
  current: number;
  total: number;
}

export const TransactionProgress: FC<TransactionProgressProps> = ({ current, total }) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="text-center py-8">
      <div className="w-24 h-24 relative mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1f2937"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.83} 283`}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{percentage}%</span>
        </div>
      </div>

      <p className="text-lg font-semibold mb-2">
        Processing Transaction {current} of {total}
      </p>
      <p className="text-gray-400 text-sm">
        Please approve transactions in your wallet...
      </p>

      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i < current
                ? 'bg-solana-green'
                : i === current
                ? 'bg-solana-purple animate-pulse'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
