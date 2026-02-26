'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PriceProvider, BtcPrice, SolPrice } from '@/components/PriceTicker';
import { FooterSocialLinks } from '@/components/Heartbeat';

const Sidebar = dynamic(() => import('./Sidebar').then(m => ({ default: m.Sidebar })), { ssr: false });

const SIDEBAR_KEY = 'sidebar-open';
const SOLT_PROMO_KEY = 'solt-promo-dismissed';

const SidebarContext = createContext(true);
export const useSidebarOpen = () => useContext(SidebarContext);

const SoltPromo = () => {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(SOLT_PROMO_KEY) === 'true';
  });

  if (dismissed || pathname === '/pumptoken' || pathname === '/burn-lock') return null;

  const isHome = pathname === '/';
  const isToolPage = pathname === '/xray' || pathname === '/scan';

  return (
    <div className={`fixed z-40 flex items-center ${isToolPage ? 'top-[62px] right-4 mr-3' : isHome ? 'top-4 left-4 xl:left-[88px] gap-1.5' : 'top-4 left-4 xl:left-[88px] gap-1'}`}>
      <Link
        href="/pumptoken"
        className={`group flex items-center rounded-full bg-[#111113]/90 backdrop-blur-sm border border-solana-purple/25 hover:border-solana-purple/50 hover:scale-105 transition-all duration-200 pulse-glow ${isHome ? 'gap-2 px-3.5 py-2 hover:shadow-[0_0_20px_rgba(153,69,255,0.2)]' : 'gap-1.5 px-2.5 py-1 hover:shadow-[0_0_15px_rgba(153,69,255,0.15)]'}`}
      >
        <svg className={`flex-shrink-0 ${isHome ? 'w-4 h-4' : 'w-3 h-3'}`} viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="solt-float" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9945FF" />
              <stop offset="100%" stopColor="#14F195" />
            </linearGradient>
          </defs>
          <polygon points="50,5 93,27.5 93,72.5 50,95 7,72.5 7,27.5" fill="url(#solt-float)" />
          <polygon points="55,18 38,52 50,52 45,82 62,48 50,48" fill="white" />
        </svg>
        <span className={`font-semibold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent ${isHome ? 'text-[11px]' : 'text-[9.5px]'}`}>{isHome ? '$SOLT is live' : '$SOLT'}</span>
        <svg className={`text-solana-purple group-hover:translate-x-0.5 transition-transform ${isHome ? 'w-3 h-3' : 'w-2.5 h-2.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      {isHome && (
        <button
          onClick={() => {
            setDismissed(true);
            localStorage.setItem(SOLT_PROMO_KEY, 'true');
          }}
          className="w-6 h-6 rounded-full bg-[#111113]/90 backdrop-blur-sm border border-[#222228] flex items-center justify-center text-gray-600 hover:text-white hover:border-[#333] transition-all"
          title="Dismiss"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export const ToolLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isAdmin = pathname === '/d/sr-ctrl';

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(SIDEBAR_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const toggle = () => setSidebarOpen(prev => !prev);

  // Admin page gets no sidebar/footer/bottom-nav
  if (isAdmin) {
    return (
      <SidebarContext.Provider value={false}>
        {children}
      </SidebarContext.Provider>
    );
  }

  return (
    <PriceProvider>
    <SidebarContext.Provider value={sidebarOpen}>
    <div className="min-h-screen xl:h-screen flex flex-col xl:overflow-hidden">
      {/* Desktop sidebar — hidden below xl */}
      <div className="hidden xl:block">
        <Sidebar activePath={pathname} isOpen={sidebarOpen} onToggle={toggle} />
      </div>

      {/* Floating expand button — visible when sidebar is collapsed */}
      <button
        onClick={toggle}
        className={`group fixed bottom-16 left-4 z-50 hidden xl:flex items-center justify-center w-9 h-9 rounded-lg bg-[#111113]/80 backdrop-blur-sm border border-[#222228] text-gray-500 hover:text-solana-purple hover:border-solana-purple/30 hover:shadow-[0_0_12px_rgba(153,69,255,0.15)] ${
          sidebarOpen ? 'opacity-0 scale-75 -translate-x-3 pointer-events-none' : 'opacity-100 scale-100 translate-x-0'
        }`}
        style={{ transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms, box-shadow 200ms, color 200ms', transitionDelay: sidebarOpen ? '0ms' : '150ms' }}
        title="Expand sidebar"
      >
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      {/* Main content area — offset by sidebar width on desktop */}
      <div
        className={`flex-1 flex flex-col xl:min-h-0 xl:overflow-y-auto ${
          sidebarOpen ? 'xl:ml-[72px]' : 'xl:ml-0'
        }`}
        style={{ transition: 'margin-left 350ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {children}

        {/* Footer */}
        <footer className="mt-auto sticky bottom-0 bg-[#0a0a0b] z-40 pt-3 pb-3 border-t border-[#222228]">
          <div className="px-6 lg:px-10 flex items-center justify-between text-[11px] text-gray-500">
            <BtcPrice />
            <FooterSocialLinks />
            <SolPrice />
          </div>
        </footer>
      </div>

      <SoltPromo />
    </div>
    </SidebarContext.Provider>
    </PriceProvider>
  );
};
