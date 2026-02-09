'use client';

import { FC, useState, useCallback, useEffect, useRef } from 'react';

interface AdminLoginProps {
  onAuthenticated: (token: string) => void;
}

type LoginStep = 'key' | 'totp';

export const AdminLogin: FC<AdminLoginProps> = ({ onAuthenticated }) => {
  const [step, setStep] = useState<LoginStep>('key');
  const [key, setKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const totpInputRef = useRef<HTMLInputElement>(null);

  // Check for existing session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('sr-admin-key');
    if (stored) {
      verifyToken(stored, null).then((result) => {
        if (result === 'ok') {
          onAuthenticated(stored);
        } else {
          sessionStorage.removeItem('sr-admin-key');
        }
        setCheckingSession(false);
      });
    } else {
      setCheckingSession(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus TOTP input when step changes
  useEffect(() => {
    if (step === 'totp' && totpInputRef.current) {
      totpInputRef.current.focus();
    }
  }, [step]);

  const verifyToken = async (token: string, totp: string | null): Promise<'ok' | 'totp_required' | 'error'> => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) return 'error';

    try {
      const res = await fetch(`${workerUrl}/api/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: totp ? JSON.stringify({ totp }) : undefined,
      });

      if (res.ok) return 'ok';

      if (res.status === 403) {
        const data = await res.json() as { totpRequired?: boolean };
        if (data.totpRequired) return 'totp_required';
      }

      return 'error';
    } catch {
      return 'error';
    }
  };

  const handleKeySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || loading) return;

    setLoading(true);
    setError(null);

    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) {
      setError('Worker URL not configured');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${workerUrl}/api/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
        },
      });

      if (res.ok) {
        sessionStorage.setItem('sr-admin-key', key.trim());
        onAuthenticated(key.trim());
      } else if (res.status === 403) {
        const data = await res.json() as { totpRequired?: boolean };
        if (data.totpRequired) {
          setStep('totp');
          setError(null);
        } else {
          setError('Access denied');
        }
      } else if (res.status === 429) {
        setError('Too many attempts. Please wait and try again.');
      } else {
        setError('Invalid admin key');
      }
    } catch {
      setError('Connection failed. Is the worker running?');
    }

    setLoading(false);
  }, [key, loading, onAuthenticated]);

  const handleTotpSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode.trim() || loading) return;

    setLoading(true);
    setError(null);

    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (!workerUrl) {
      setError('Worker URL not configured');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${workerUrl}/api/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
        },
        body: JSON.stringify({ totp: totpCode.trim() }),
      });

      if (res.ok) {
        sessionStorage.setItem('sr-admin-key', key.trim());
        onAuthenticated(key.trim());
      } else if (res.status === 429) {
        setError('Too many attempts. Please wait and try again.');
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Invalid authenticator code');
        setTotpCode('');
      }
    } catch {
      setError('Connection failed');
    }

    setLoading(false);
  }, [key, totpCode, loading, onAuthenticated]);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 rounded-full border-4 border-solana-purple/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-solana-purple animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 gradient-text">Admin Access</h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          {step === 'key' ? 'Enter your admin key to continue' : 'Enter your authenticator code'}
        </p>

        {/* Step 1: Admin Key */}
        {step === 'key' && (
          <form onSubmit={handleKeySubmit}>
            <div className="card p-6">
              <label className="block text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                Admin Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter your admin key..."
                  className="w-full bg-[#0d0d0f] border border-[#222228] rounded-xl px-4 py-3 pr-10 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-solana-purple/50 transition-colors"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showKey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!key.trim() || loading}
                className="w-full mt-4 btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Continue
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: TOTP Code */}
        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit}>
            <div className="card p-6">
              <label className="block text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                Authenticator Code
              </label>
              <input
                ref={totpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTotpCode(val);
                }}
                placeholder="000000"
                className="w-full bg-[#0d0d0f] border border-[#222228] rounded-xl px-4 py-4 text-white text-2xl font-mono text-center tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-solana-purple/50 transition-colors"
                autoComplete="one-time-code"
              />
              <p className="text-[11px] text-gray-600 mt-2 text-center">
                Open your authenticator app and enter the 6-digit code
              </p>

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={totpCode.length !== 6 || loading}
                className="w-full mt-4 btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  'Authenticate'
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep('key'); setError(null); setTotpCode(''); }}
                className="w-full mt-2 text-xs text-gray-500 hover:text-white transition-colors py-2"
              >
                Back to admin key
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-[11px] text-gray-600 mt-6">
          SolReclaimer Admin Panel
        </p>
      </div>
    </div>
  );
};
