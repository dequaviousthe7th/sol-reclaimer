'use client';

import { FC, useState, useCallback, useRef, useEffect } from 'react';
import { validatePrefix, validateSuffix } from '@/lib/vanity/generator';
import { WorkerManager } from '@/lib/vanity/worker-manager';
import { VanityResult } from './VanityResult';

type Mode = 'prefix' | 'suffix' | 'both';
type Status = 'idle' | 'searching' | 'found' | 'stopped';

interface FoundResult {
  address: string;
  secretKey: Uint8Array;
  totalAttempts: number;
  elapsedMs: number;
}

export const VanityGenerator: FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<Mode>('prefix');
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoundResult | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [rate, setRate] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const managerRef = useRef<WorkerManager | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      managerRef.current?.stop();
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const handleStart = useCallback(() => {
    setError(null);
    setResult(null);

    try {
      if (mode === 'prefix' || mode === 'both') {
        if (!prefix) { setError('Enter a prefix'); return; }
        if (prefix.length > 4) { setError('Max 4 characters for prefix'); return; }
        validatePrefix(prefix, caseSensitive);
      }
      if (mode === 'suffix' || mode === 'both') {
        if (!suffix) { setError('Enter a suffix'); return; }
        if (suffix.length > 4) { setError('Max 4 characters for suffix'); return; }
        validateSuffix(suffix, caseSensitive);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid pattern');
      return;
    }

    setStatus('searching');
    setAttempts(0);
    setRate(0);
    setElapsed(0);
    startTimeRef.current = Date.now();

    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 100);

    const workerCount = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
    const manager = new WorkerManager({
      prefix: (mode === 'prefix' || mode === 'both') ? prefix : undefined,
      suffix: (mode === 'suffix' || mode === 'both') ? suffix : undefined,
      caseSensitive,
      workerCount,
      onProgress: (totalAttempts, currentRate) => {
        setAttempts(totalAttempts);
        setRate(currentRate);
      },
      onFound: (address, secretKey, totalAttempts) => {
        const elapsedMs = Date.now() - startTimeRef.current;
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        setResult({ address, secretKey, totalAttempts, elapsedMs });
        setAttempts(totalAttempts);
        setElapsed(elapsedMs);
        setStatus('found');
      },
      onError: (err) => {
        if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
        setError(err);
        setStatus('idle');
      },
    });

    managerRef.current = manager;
    manager.start();
  }, [prefix, suffix, caseSensitive, mode]);

  const handleStop = useCallback(() => {
    managerRef.current?.stop();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setStatus('stopped');
  }, []);

  const handleReset = useCallback(() => {
    managerRef.current?.stop();
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    setStatus('idle');
    setResult(null);
    setAttempts(0);
    setRate(0);
    setElapsed(0);
    setError(null);
  }, []);

  const getDifficultyEstimate = (length: number) => {
    if (length <= 1) return 'Instant';
    if (length === 2) return '< 1 second';
    if (length === 3) return '~5-30 seconds';
    if (length === 4) return '~2-10 minutes';
    return 'Unknown';
  };

  const activeLength = Math.max(
    (mode === 'prefix' || mode === 'both') ? prefix.length : 0,
    (mode === 'suffix' || mode === 'both') ? suffix.length : 0
  );

  return (
    <div className="flex-1 flex flex-col justify-center py-6">
      {/* Security Warning Banner */}
      <div className="card p-4 mb-6 border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-sm text-yellow-200 font-medium">Client-Side Generation</p>
            <p className="text-xs text-gray-400 mt-1">
              Keys are generated entirely in your browser using Rust WASM. Nothing is sent to any server.
              Never share your private key. Download and store it securely.
            </p>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card p-6">
        {/* Input Section */}
        {(status === 'idle' || status === 'stopped') && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Generate Vanity Address</h2>
            <p className="text-sm text-gray-400 mb-6">
              Create a Solana wallet address that starts or ends with your chosen letters.
            </p>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              {(['prefix', 'suffix', 'both'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    mode === m
                      ? 'bg-solana-purple/20 text-solana-purple border border-solana-purple/30'
                      : 'bg-[#16161a] text-gray-400 border border-[#222228] hover:border-gray-600'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {/* Prefix Input */}
            {(mode === 'prefix' || mode === 'both') && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Prefix (1-4 chars)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={prefix}
                  onChange={e => setPrefix(e.target.value)}
                  placeholder="e.g. SOL"
                  className="w-full bg-[#16161a] border border-[#222228] rounded-xl px-4 py-3 text-white
                             placeholder-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors
                             font-mono text-lg"
                />
              </div>
            )}

            {/* Suffix Input */}
            {(mode === 'suffix' || mode === 'both') && (
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Suffix (1-4 chars)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={suffix}
                  onChange={e => setSuffix(e.target.value)}
                  placeholder="e.g. deq"
                  className="w-full bg-[#16161a] border border-[#222228] rounded-xl px-4 py-3 text-white
                             placeholder-gray-600 focus:border-solana-purple/50 focus:outline-none transition-colors
                             font-mono text-lg"
                />
              </div>
            )}

            {/* Case Sensitive Toggle */}
            <label className="flex items-center gap-3 mb-4 cursor-pointer group">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${
                caseSensitive ? 'bg-solana-purple' : 'bg-[#333]'
              }`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                  caseSensitive ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <span className="text-sm text-gray-400 group-hover:text-gray-300">Case sensitive</span>
            </label>

            {/* Difficulty Estimate */}
            {activeLength > 0 && (
              <div className="flex items-center gap-2 mb-6 text-sm">
                <span className="text-gray-500">Estimated time:</span>
                <span className={`font-medium ${
                  activeLength <= 2 ? 'text-solana-green' :
                  activeLength === 3 ? 'text-yellow-400' :
                  'text-orange-400'
                }`}>
                  {getDifficultyEstimate(activeLength)}
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <button onClick={handleStart} className="w-full btn-primary py-3.5 text-base">
              {status === 'stopped' ? 'Try Again' : 'Generate'}
            </button>

            {/* Base58 Info */}
            <p className="text-xs text-gray-600 mt-3 text-center">
              Solana addresses use Base58: A-Z, a-z, 1-9 (no 0, O, I, l)
            </p>
          </>
        )}

        {/* Searching State */}
        {status === 'searching' && (
          <div className="text-center py-8">
            {/* Spinner */}
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
            </div>

            <p className="text-gray-400 mb-1">
              Searching for {(mode === 'prefix' || mode === 'both') && prefix && `prefix "${prefix}"`}
              {mode === 'both' && prefix && suffix && ' and '}
              {(mode === 'suffix' || mode === 'both') && suffix && `suffix "${suffix}"`}...
            </p>
            <p className="text-xs text-gray-600 mb-6">
              Using {Math.max(1, (navigator.hardwareConcurrency || 4) - 1)} worker threads with Rust WASM
            </p>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase">Attempts</p>
                <p className="text-lg font-bold text-white font-mono">{attempts.toLocaleString()}</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase">Rate</p>
                <p className="text-lg font-bold text-solana-green font-mono">{rate.toLocaleString()}/s</p>
              </div>
              <div className="stat-card">
                <p className="text-xs text-gray-500 uppercase">Elapsed</p>
                <p className="text-lg font-bold text-white font-mono">{(elapsed / 1000).toFixed(1)}s</p>
              </div>
            </div>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              className="px-8 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Stop
            </button>
          </div>
        )}

        {/* Found State */}
        {status === 'found' && result && (
          <VanityResult
            address={result.address}
            secretKey={result.secretKey}
            totalAttempts={result.totalAttempts}
            elapsedMs={result.elapsedMs}
            prefix={(mode === 'prefix' || mode === 'both') ? prefix : undefined}
            suffix={(mode === 'suffix' || mode === 'both') ? suffix : undefined}
            onReset={handleReset}
          />
        )}
      </div>

      {/* How It Works — below main card */}
      {(status === 'idle' || status === 'stopped') && (
        <div className="grid md:grid-cols-3 gap-3 mt-6">
          <div className="card card-hover p-4 text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-3 text-solana-purple">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-white">Enter Pattern</h3>
            <p className="text-gray-400 text-xs">Choose a 1-4 letter prefix or suffix</p>
          </div>
          <div className="card card-hover p-4 text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-3 text-solana-purple">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-white">Generate</h3>
            <p className="text-gray-400 text-xs">Multiple threads search in parallel using Rust WASM</p>
          </div>
          <div className="card card-hover p-4 text-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-solana-purple/20 to-solana-green/20 flex items-center justify-center mx-auto mb-3 text-solana-purple">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <h3 className="font-semibold text-sm mb-1 text-white">Download Key</h3>
            <p className="text-gray-400 text-xs">Save your keypair securely (Solana CLI format)</p>
          </div>
        </div>
      )}
    </div>
  );
};
