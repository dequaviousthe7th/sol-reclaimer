'use client';

import { FC, useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  RentReclaimer as RentReclaimerCore,
  ScanResult,
  TokenAccountInfo,
  formatSol,
  CloseAccountsResult
} from '@sol-reclaim/core';
import { AccountList } from './AccountList';
import { TransactionProgress } from './TransactionProgress';

type Status = 'idle' | 'scanning' | 'ready' | 'closing' | 'complete' | 'error';

export const RentReclaimer: FC = () => {
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

      // Test connection first
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

      // Select all closeable accounts by default
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
      {/* Status Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {status === 'idle' && 'Ready to Scan'}
            {status === 'scanning' && 'Scanning...'}
            {status === 'ready' && 'Scan Complete'}
            {status === 'closing' && 'Closing Accounts...'}
            {status === 'complete' && 'Complete!'}
            {status === 'error' && 'Error'}
          </h2>
          {(status === 'ready' || status === 'complete' || status === 'error') && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Start Over
            </button>
          )}
        </div>

        {/* Idle State */}
        {status === 'idle' && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-6">
              Scan your wallet to find empty token accounts that can be closed.
            </p>
            <button
              onClick={handleScan}
              className="bg-gradient-to-r from-solana-purple to-solana-green px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Scan Wallet
            </button>
          </div>
        )}

        {/* Scanning State */}
        {status === 'scanning' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-solana-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Scanning token accounts...</p>
          </div>
        )}

        {/* Ready State - Show Results */}
        {status === 'ready' && scanResult && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Accounts"
                value={scanResult.totalAccounts.toString()}
              />
              <StatCard
                label="Empty Accounts"
                value={scanResult.closeableAccounts.length.toString()}
                highlight
              />
              <StatCard
                label="Selected"
                value={selectedAccounts.size.toString()}
              />
              <StatCard
                label="SOL to Reclaim"
                value={`${formatSol(selectedReclaimable)}`}
                highlight
                suffix="SOL"
              />
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
                  className="w-full mt-6 bg-gradient-to-r from-solana-purple to-solana-green px-8 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close {selectedAccounts.size} Account{selectedAccounts.size !== 1 ? 's' : ''} & Reclaim {formatSol(selectedReclaimable)} SOL
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-2xl mb-2">No empty accounts found.</p>
                <p>Your wallet is clean! Nothing to reclaim.</p>
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
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-solana-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-solana-green mb-2">
              {formatSol(closeResult.reclaimedLamports)} SOL Reclaimed!
            </h3>
            <p className="text-gray-400 mb-6">
              Successfully closed {closeResult.closedCount} account{closeResult.closedCount !== 1 ? 's' : ''}
            </p>

            {closeResult.signatures.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-4 text-left max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-400 mb-2">Transaction Signatures:</p>
                {closeResult.signatures.map((sig, i) => (
                  <a
                    key={i}
                    href={`https://solscan.io/tx/${sig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-solana-purple hover:text-solana-green truncate"
                  >
                    {sig}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({
  label,
  value,
  suffix,
  highlight = false
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-gray-800/50 rounded-xl p-4 ${highlight ? 'border border-solana-green/30' : ''}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-solana-green' : 'text-white'}`}>
        {value}
        {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
