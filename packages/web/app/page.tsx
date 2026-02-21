import Link from 'next/link';
import dynamic from 'next/dynamic';

const WalletStatsHub = dynamic(() => import('../components/WalletStatsHub'), { ssr: false });

const tools = [
  {
    id: 'reclaim',
    title: 'SOL Reclaimer',
    badge: 'MAINNET',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Reclaim locked SOL from empty token accounts. Connect your wallet, scan for reclaimable rent, and close accounts in one click.',
    href: '/reclaim',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'vanity',
    title: 'Vanity Generator',
    badge: 'CLIENT-SIDE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Generate custom Solana wallet addresses with your chosen prefix or suffix. Runs entirely in your browser — keys never leave your device.',
    href: '/vanity',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    id: 'hackathon',
    title: 'Hackathon Screener',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Track PumpFun "Build in Public" hackathon tokens with live market data, price changes, and key links — all in one place.',
    href: '/hackathon',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-6 h-3.5" viewBox="0 0 20 12" fill="none">
        <rect x="0.5" y="0.5" width="19" height="11" rx="5.5" fill="white" stroke="#222228" strokeWidth="1" />
        <path d="M10 0.5H14.5C17.2614 0.5 19.5 2.73858 19.5 5.5V6.5C19.5 9.26142 17.2614 11.5 14.5 11.5H10V0.5Z" fill="#82e24c" stroke="#222228" strokeWidth="1" />
      </svg>
    ),
  },
  {
    id: 'scan',
    title: 'Token Scanner',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'Instant safety reports for any Solana token. Check risk scores, holder concentration, LP status, and market data before you buy.',
    href: '/scan',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'xray',
    title: 'Wallet X-Ray',
    badge: 'LIVE',
    badgeClass: 'bg-solana-green/20 text-solana-green border-solana-green/30',
    description: 'See any wallet\'s true trading performance. PnL breakdown, win rate, trader grade, and per-token analysis — no wallet connection needed.',
    href: '/xray',
    accentFrom: 'from-solana-purple',
    accentTo: 'to-solana-green',
    iconBg: 'from-solana-purple/10 to-solana-green/10',
    iconColor: 'text-solana-purple',
    hoverBorder: 'group-hover:border-solana-purple/40 group-hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]',
    linkColor: 'text-solana-purple',
    dotColor: 'bg-solana-green/60 group-hover:bg-solana-green',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
];

const features = [
  { label: 'Zero Fees', icon: '0' },
  { label: 'Open Source', icon: '{}' },
  { label: 'No Tracking', icon: '~' },
];

export default function HubPage() {
  return (
    <main className="flex-1 flex flex-col pb-6 relative">

      {/* My Stats pill — top right, only when wallet connected */}
      <div className="hidden sm:block absolute top-4 right-4 z-10">
        <WalletStatsHub />
      </div>

      {/* Hero */}
      <section className="pt-8 sm:pt-11 pb-4 sm:pb-6 text-center px-4 relative">
        {/* Floating animated logo */}
        <div className="flex justify-center mb-3.5">
          <div className="float pulse-glow w-[54px] sm:w-[68px] h-[54px] sm:h-[68px] rounded-2xl bg-gradient-to-br from-solana-purple to-solana-green flex items-center justify-center">
            <svg className="w-[31px] sm:w-[39px] h-[31px] sm:h-[39px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L21 7V17L12 22L3 17V7Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 8L10.5 12.5H13.5L11 17" />
            </svg>
          </div>
        </div>
        <h1 className="text-[1.9rem] sm:text-[2.4rem] font-bold gradient-text mb-1.5">SolTools</h1>
        <p className="text-gray-400 text-[13.5px] sm:text-[15px] max-w-md mx-auto mb-4">
          Free, open-source Solana tools. No fees, no tracking, no compromise.
        </p>

        {/* Feature pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-1.5 px-[11px] py-1.5 rounded-full bg-[#111113] border border-[#222228] text-[11.5px] text-gray-400">
              <span className="text-solana-purple font-mono font-bold text-[10px]">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </section>

      {/* Tools grid */}
      <section className="px-4 max-w-[51rem] mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.filter(t => t.id !== 'hackathon').map(tool => (
          <Link
            key={tool.id}
            href={tool.href}
            className="card card-hover group flex flex-col overflow-hidden transition-all"
          >
            {/* Gradient accent top bar */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${tool.accentFrom} ${tool.accentTo} opacity-60 group-hover:opacity-100 transition-opacity`} />

            <div className="p-[16px] flex flex-col flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-[39px] h-[39px] rounded-xl bg-gradient-to-br ${tool.iconBg} flex items-center justify-center border border-[#222228] ${tool.iconColor} ${tool.hoverBorder} transition-all [&>svg]:w-[21px] [&>svg]:h-[21px]`}>
                  {tool.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-white font-semibold text-[13.5px] leading-snug">{tool.title}</h2>
                  <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-semibold rounded-full border ${tool.badgeClass}`}>
                    {tool.badge}
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-[11.5px] leading-[1.6] flex-1">{tool.description}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className={`${tool.linkColor} text-[11.5px] font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1`}>
                  Open tool
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${tool.dotColor} animate-pulse`} />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Coming soon teaser */}
      <section className="px-4 max-w-[51rem] mx-auto w-full mt-3">
        <div className="relative rounded-xl border border-dashed border-[#222228] px-3.5 py-[20px] flex items-center gap-3 overflow-hidden">
          <div className="shimmer absolute inset-0 pointer-events-none" />
          <div className="w-[38px] h-[38px] rounded-lg bg-[#111113] flex items-center justify-center border border-[#222228] text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <p className="text-gray-500 text-[11px] font-medium">More tools coming soon</p>
            <p className="text-gray-600 text-[10px] mt-0.5">Exit strategy calculator, dev toolkit, and more in the works.</p>
          </div>
        </div>
      </section>

      {/* Discord bot promo */}
      <section className="px-4 max-w-[51rem] mx-auto w-full mt-3">
        <Link href="/stb" className="group block relative rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/[0.04] hover:bg-[#5865F2]/[0.08] hover:border-[#5865F2]/35 transition-all overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#5865F2] to-solana-purple opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="px-4 py-3.5 flex items-center gap-3.5">
            <div className="w-[38px] h-[38px] rounded-lg bg-[#5865F2]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#5865F2]/25 transition-colors">
              <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[12px] font-semibold">SolTools Bot for Discord</p>
              <p className="text-gray-500 text-[10.5px] mt-0.5">Scan tokens, track locks, and spot trends — right in your server.</p>
            </div>
            <span className="text-[#5865F2] text-[11px] font-medium group-hover:translate-x-0.5 transition-transform hidden sm:inline-flex items-center gap-1 flex-shrink-0">
              Learn more
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </Link>
      </section>

    </main>
  );
}
