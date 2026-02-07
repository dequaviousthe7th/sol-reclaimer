'use client';

import { FC } from 'react';

export const WalletInsight: FC = () => {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Did You Know?</p>
      <div className="space-y-3">
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 text-solana-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <div>
            <p className="text-xs text-gray-300 font-medium">Average wallet has 15+ empty accounts</p>
            <p className="text-[11px] text-gray-600 mt-0.5">That&apos;s ~0.03 SOL locked up doing nothing</p>
          </div>
        </div>
        <div className="w-full h-px bg-[#1a1a1f]"></div>
        <div className="flex items-start gap-2.5">
          <svg className="w-4 h-4 text-solana-purple flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-xs text-gray-300 font-medium">Takes under 30 seconds</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Scan, select, reclaim — that simple</p>
          </div>
        </div>
      </div>
    </div>
  );
};
