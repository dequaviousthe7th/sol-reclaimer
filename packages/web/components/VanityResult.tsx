'use client';

import { FC, useState, useCallback, useMemo } from 'react';

interface VanityResultProps {
  address: string;
  secretKey: Uint8Array;
  totalAttempts: number;
  elapsedMs: number;
  prefix?: string;
  suffix?: string;
  onReset: () => void;
}

// Simple base58 encode for the secret key display
function base58Encode(bytes: Uint8Array): string {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const base = BigInt(58);
  let num = BigInt(0);
  for (const byte of bytes) {
    num = num * BigInt(256) + BigInt(byte);
  }
  let result = '';
  while (num > BigInt(0)) {
    const [q, r] = [num / base, num % base];
    result = ALPHABET[Number(r)] + result;
    num = q;
  }
  // Leading zeros
  for (const byte of bytes) {
    if (byte === 0) result = '1' + result;
    else break;
  }
  return result || '1';
}

export const VanityResult: FC<VanityResultProps> = ({
  address, secretKey, totalAttempts, elapsedMs, prefix, suffix, onReset
}) => {
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const base58SecretKey = useMemo(() => base58Encode(secretKey), [secretKey]);

  const copyToClipboard = useCallback(async (text: string, type: 'address' | 'key') => {
    await navigator.clipboard.writeText(text);
    if (type === 'address') { setCopiedAddress(true); setTimeout(() => setCopiedAddress(false), 2000); }
    else { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
  }, []);

  const downloadKeypair = useCallback(() => {
    const json = JSON.stringify(Array.from(secretKey));
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${address.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [secretKey, address]);

  const prefixLen = prefix?.length || 0;
  const suffixLen = suffix?.length || 0;

  return (
    <div className="text-center py-6">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-solana-green/20 flex items-center justify-center mx-auto mb-4 glow-green">
        <svg className="w-8 h-8 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-white mb-1">Address Found!</h3>
      <p className="text-sm text-gray-400 mb-6">
        {totalAttempts.toLocaleString()} attempts in {(elapsedMs / 1000).toFixed(1)}s
      </p>

      {/* Public Address */}
      <div className="bg-[#0d0d0f] border border-[#222228] rounded-xl p-4 mb-4 text-left">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Public Address</p>
          <button
            onClick={() => copyToClipboard(address, 'address')}
            className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {copiedAddress ? 'Copied!' : 'Copy'}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <span className="font-mono text-lg break-all">
          {prefixLen > 0 && <span className="text-solana-green">{address.slice(0, prefixLen)}</span>}
          <span className="text-white">{address.slice(prefixLen, address.length - (suffixLen || 0))}</span>
          {suffixLen > 0 && <span className="text-solana-green">{address.slice(-suffixLen)}</span>}
        </span>
      </div>

      {/* Private Key */}
      <div className="bg-[#0d0d0f] border border-red-500/20 rounded-xl p-4 mb-4 text-left">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-red-400 uppercase tracking-wide">Private Key (Base58)</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              {showPrivateKey ? 'Hide' : 'Reveal'}
            </button>
            {showPrivateKey && (
              <button
                onClick={() => copyToClipboard(base58SecretKey, 'key')}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copiedKey ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
        </div>
        {showPrivateKey ? (
          <span className="font-mono text-sm text-red-300 break-all">{base58SecretKey}</span>
        ) : (
          <span className="font-mono text-sm text-gray-600">Click &quot;Reveal&quot; to show private key</span>
        )}
      </div>

      {/* Warning */}
      <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl mb-6">
        <p className="text-xs text-red-400">
          Never share your private key. Anyone with this key has full control of this wallet.
          Download and store it in a safe location.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={downloadKeypair} className="btn-primary px-6 py-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Keypair
        </button>
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-xl border border-[#222228] text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          Generate Another
        </button>
      </div>
    </div>
  );
};
