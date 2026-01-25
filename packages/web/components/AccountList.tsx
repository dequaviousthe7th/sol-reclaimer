'use client';

import { FC, useState } from 'react';
import { TokenAccountInfo, formatSol } from '@sol-reclaim/core';

interface AccountListProps {
  accounts: TokenAccountInfo[];
  selectedAccounts: Set<string>;
  onToggle: (pubkey: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const AccountList: FC<AccountListProps> = ({
  accounts,
  selectedAccounts,
  onToggle,
  onSelectAll,
  onDeselectAll,
}) => {
  const [showAll, setShowAll] = useState(false);
  const displayedAccounts = showAll ? accounts : accounts.slice(0, 10);
  const hasMore = accounts.length > 10;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {selectedAccounts.size} of {accounts.length} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="text-sm text-solana-purple hover:text-solana-green transition-colors"
          >
            Select All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={onDeselectAll}
            className="text-sm text-solana-purple hover:text-solana-green transition-colors"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
        {displayedAccounts.map((account) => {
          const pubkey = account.pubkey.toBase58();
          const isSelected = selectedAccounts.has(pubkey);

          return (
            <div
              key={pubkey}
              onClick={() => onToggle(pubkey)}
              className={`flex items-center justify-between p-3 border-b border-gray-800 last:border-0 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                isSelected ? 'bg-solana-purple/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-solana-purple border-solana-purple'
                      : 'border-gray-600'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-mono text-sm">
                    {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Mint: {account.mint.toBase58().slice(0, 8)}...
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-solana-green font-semibold">
                  {formatSol(account.rentLamports)}
                </p>
                <p className="text-xs text-gray-500">SOL</p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-sm text-solana-purple hover:text-solana-green transition-colors py-2"
        >
          {showAll ? 'Show Less' : `Show All (${accounts.length - 10} more)`}
        </button>
      )}
    </div>
  );
};
