'use client';

import { FC, useState } from 'react';

export interface TokenCardData {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  pairUrl: string;
  pumpFunUrl: string;
  twitterUrl: string | null;
  websiteUrl: string | null;
  telegramUrl: string | null;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatPrice(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.001) return `$${n.toFixed(4)}`;
  if (n >= 0.0000001) return `$${n.toFixed(8)}`;
  return `$${n.toExponential(2)}`;
}

export const TokenCard: FC<{ token: TokenCardData }> = ({ token }) => {
  const [imgError, setImgError] = useState(false);
  const changePositive = token.priceChange24h >= 0;

  return (
    <div className="card card-hover group flex flex-col overflow-hidden">
      {/* Orange gradient accent bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-orange-500 to-yellow-400 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="p-4 flex flex-col flex-1">
        {/* Top row: image + name + price */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Token image */}
            {token.imageUrl && !imgError ? (
              <img
                src={token.imageUrl}
                alt={token.symbol}
                className="w-10 h-10 rounded-full flex-shrink-0"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-500/30 to-yellow-400/30 flex items-center justify-center text-sm font-bold text-orange-400">
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{token.name}</p>
              <p className="text-gray-500 text-xs">${token.symbol}</p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-2">
            <p className="text-white font-semibold text-sm">{formatPrice(token.priceUsd)}</p>
            <p className={`text-xs font-medium ${changePositive ? 'text-green-400' : 'text-red-400'}`}>
              {changePositive ? '+' : ''}{token.priceChange24h.toFixed(1)}% 24h
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>MCap: {formatCompact(token.marketCap)}</span>
          <span>Vol: {formatCompact(token.volume24h)}</span>
          <span>Liq: {formatCompact(token.liquidity)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-[#222228] mb-3" />

        {/* Links row */}
        <div className="flex items-center gap-2">
          <a
            href={token.pumpFunUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 rounded-lg bg-[#0a0a0b] border border-[#222228] text-[10px] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
          >
            pump.fun
          </a>
          {token.pairUrl && (
            <a
              href={token.pairUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-lg bg-[#0a0a0b] border border-[#222228] text-[10px] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
            >
              DexScreener
            </a>
          )}
          {token.twitterUrl && (
            <a
              href={token.twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-[#0a0a0b] border border-[#222228] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
              title="X / Twitter"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          )}
          {token.websiteUrl && (
            <a
              href={token.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-[#0a0a0b] border border-[#222228] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
              title="Website"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </a>
          )}
          {token.telegramUrl && (
            <a
              href={token.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded-lg bg-[#0a0a0b] border border-[#222228] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-colors"
              title="Telegram"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
