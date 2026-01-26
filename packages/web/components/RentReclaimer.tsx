'use client';

import { FC, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  RentReclaimer as RentReclaimerCore,
  ScanResult,
  TokenAccountInfo,
  formatSol,
  CloseAccountsResult
} from '@solreclaimer/core';
import { AccountList } from './AccountList';
import { TransactionProgress } from './TransactionProgress';

type Status = 'idle' | 'scanning' | 'ready' | 'closing' | 'complete' | 'error';

interface RentReclaimerProps {
  onBack?: () => void;
}

export const RentReclaimer: FC<RentReclaimerProps> = ({ onBack }) => {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions } = useWallet();

  const [status, setStatus] = useState<Status>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [closeResult, setCloseResult] = useState<CloseAccountsResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    if (!publicKey) return;

    setStatus('scanning');
    setError(null);
    setScanResult(null);

    try {
      console.log('Connection endpoint:', connection.rpcEndpoint);
      console.log('Scanning wallet:', publicKey.toBase58());

      try {
        const balance = await connection.getBalance(publicKey);
        console.log('Wallet SOL balance:', balance / 1e9);
      } catch (connErr) {
        console.error('Connection test failed:', connErr);
        throw new Error(`RPC connection failed: ${connErr}`);
      }

      const reclaimer = new RentReclaimerCore({
        connection: connection,
      });

      const result = await reclaimer.scan(publicKey);
      console.log('Scan result:', JSON.stringify(result, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2));
      setScanResult(result);

      const allSelected = new Set(
        result.closeableAccounts.map(acc => acc.pubkey.toBase58())
      );
      setSelectedAccounts(allSelected);

      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan wallet');
      setStatus('error');
    }
  }, [publicKey, connection]);

  const handleClose = useCallback(async () => {
    if (!publicKey || !signAllTransactions || !scanResult) {
      console.log('Missing requirements:', { publicKey: !!publicKey, signAllTransactions: !!signAllTransactions, scanResult: !!scanResult });
      return;
    }

    setStatus('closing');
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      const accountsToClose = scanResult.closeableAccounts.filter(
        acc => selectedAccounts.has(acc.pubkey.toBase58())
      );

      console.log('Accounts to close:', accountsToClose.length);
      console.log('Selected accounts:', selectedAccounts.size);

      if (accountsToClose.length === 0) {
        setError('No accounts selected');
        setStatus('ready');
        return;
      }

      const reclaimer = new RentReclaimerCore({
        connection: connection,
      });

      console.log('Calling closeWithWallet...');
      const result = await reclaimer.closeWithWallet(
        publicKey,
        signAllTransactions,
        accountsToClose,
        {
          batchSize: 20,
          onProgress: (current, total) => {
            console.log('Progress:', current, '/', total);
            setProgress({ current, total });
          },
        }
      );

      console.log('Close result:', result);
      setCloseResult(result);
      setStatus('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close accounts');
      setStatus('error');
    }
  }, [publicKey, signAllTransactions, scanResult, selectedAccounts, connection]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setScanResult(null);
    setSelectedAccounts(new Set());
    setCloseResult(null);
    setProgress({ current: 0, total: 0 });
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    }
  }, [onBack]);

  const toggleAccount = useCallback((pubkey: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(pubkey)) {
        next.delete(pubkey);
      } else {
        next.add(pubkey);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!scanResult) return;
    setSelectedAccounts(new Set(
      scanResult.closeableAccounts.map(acc => acc.pubkey.toBase58())
    ));
  }, [scanResult]);

  const deselectAll = useCallback(() => {
    setSelectedAccounts(new Set());
  }, []);

  const selectedReclaimable = scanResult?.closeableAccounts
    .filter(acc => selectedAccounts.has(acc.pubkey.toBase58()))
    .reduce((sum, acc) => sum + acc.rentLamports, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {status === 'idle' && 'Ready to Scan'}
              {status === 'scanning' && 'Scanning Wallet...'}
              {status === 'ready' && 'Scan Complete'}
              {status === 'closing' && 'Closing Accounts...'}
              {status === 'complete' && 'Success!'}
              {status === 'error' && 'Error'}
            </h2>
            {status === 'idle' && (
              <p className="text-sm text-gray-400 mt-1">Find and close empty token accounts</p>
            )}
          </div>
          {(status === 'ready' || status === 'complete' || status === 'error') && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start Over
            </button>
          )}
        </div>

        {/* Idle State */}
        {status === 'idle' && (
          <div>
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                Scan your wallet to discover empty token accounts that can be closed to reclaim SOL.
              </p>
              <button onClick={handleScan} className="btn-primary px-10 py-4 text-lg">
                Scan Wallet
              </button>
            </div>
          </div>
        )}

        {/* Scanning State */}
        {status === 'scanning' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
            </div>
            <p className="text-gray-400">Scanning token accounts...</p>
          </div>
        )}

        {/* Ready State */}
        {status === 'ready' && scanResult && (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-white">{scanResult.totalAccounts}</p>
              </div>
              <div className="stat-card highlight">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Empty</p>
                <p className="text-2xl font-bold text-solana-green">{scanResult.closeableAccounts.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Selected</p>
                <p className="text-2xl font-bold text-white">{selectedAccounts.size}</p>
              </div>
              <div className="stat-card highlight">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Reclaimable</p>
                <p className="text-2xl font-bold text-solana-green">{formatSol(selectedReclaimable)}</p>
              </div>
            </div>

            {scanResult.closeableAccounts.length > 0 ? (
              <>
                <AccountList
                  accounts={scanResult.closeableAccounts}
                  selectedAccounts={selectedAccounts}
                  onToggle={toggleAccount}
                  onSelectAll={selectAll}
                  onDeselectAll={deselectAll}
                />

                <button
                  onClick={handleClose}
                  disabled={selectedAccounts.size === 0}
                  className="w-full mt-6 btn-primary py-4 text-lg"
                >
                  Close {selectedAccounts.size} Account{selectedAccounts.size !== 1 ? 's' : ''} & Reclaim {formatSol(selectedReclaimable)} SOL
                </button>
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-solana-green/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl font-semibold text-white mb-2">All Clean!</p>
                <p className="text-gray-400">No empty token accounts found. Nothing to reclaim.</p>
              </div>
            )}
          </div>
        )}

        {/* Closing State */}
        {status === 'closing' && (
          <TransactionProgress current={progress.current} total={progress.total} />
        )}

        {/* Complete State */}
        {status === 'complete' && closeResult && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-solana-green/20 flex items-center justify-center mx-auto mb-6 glow-green">
              <svg className="w-10 h-10 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-solana-green mb-2">
              +{formatSol(closeResult.reclaimedLamports)} SOL
            </h3>
            <p className="text-gray-400 mb-8">
              Successfully closed {closeResult.closedCount} account{closeResult.closedCount !== 1 ? 's' : ''}
            </p>

            {closeResult.signatures.length > 0 && (
              <div className="bg-[#0d0d0f] border border-[#222228] rounded-xl p-4 text-left max-h-48 overflow-y-auto">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Transactions</p>
                {closeResult.signatures.map((sig, i) => (
                  <a
                    key={i}
                    href={`https://solscan.io/tx/${sig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-solana-purple hover:text-solana-green transition-colors py-2 border-b border-[#1a1a1f] last:border-0"
                  >
                    <span className="truncate font-mono">{sig}</span>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};
