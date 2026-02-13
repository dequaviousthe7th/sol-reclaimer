'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { MobileWalletPicker } from './MobileWalletPicker';
import { isMobileBrowser } from '@/lib/utils';

interface WalletButtonInnerProps {
  autoOpen?: boolean;
}

export const WalletButtonInner = ({ autoOpen }: WalletButtonInnerProps) => {
  const { setVisible } = useWalletModal();
  const { wallets, connected, connecting, select, connect, wallet } = useWallet();
  const hasAutoOpened = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);

  useEffect(() => {
    setMobile(isMobileBrowser());
  }, []);

  // After select(), wallet changes — then we connect
  useEffect(() => {
    if (pendingConnect && wallet && !connected && !connecting) {
      setPendingConnect(false);
      connect().catch(() => {});
    }
  }, [pendingConnect, wallet, connected, connecting, connect]);

  // Direct connect for in-app browser (wallet already injected)
  const handleDirectConnect = useCallback(() => {
    if (wallets.length > 0 && !connecting) {
      select(wallets[0].adapter.name);
      setPendingConnect(true);
    }
  }, [wallets, connecting, select]);

  // Auto-open if user clicked before providers loaded
  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      const timer = setTimeout(() => {
        if (mobile && wallets.length === 0) {
          setPickerOpen(true);
        } else if (mobile && wallets.length > 0) {
          handleDirectConnect();
        } else {
          setVisible(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, setVisible, mobile, wallets.length, handleDirectConnect]);

  // Mobile — no wallets detected (regular browser, not in wallet app)
  // Show deep-link picker to open a wallet app
  if (mobile && wallets.length === 0 && !connected) {
    return (
      <>
        <button
          onClick={() => setPickerOpen(true)}
          className="wallet-adapter-button wallet-adapter-button-trigger"
        >
          Select Wallet
        </button>
        <MobileWalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </>
    );
  }

  // Mobile — wallet detected (in-app browser, e.g. Phantom/Solflare)
  // Bypass the WalletMultiButton modal which is broken in in-app browsers
  // and directly connect to the detected wallet
  if (mobile && wallets.length > 0 && !connected) {
    return (
      <button
        onClick={handleDirectConnect}
        className="wallet-adapter-button wallet-adapter-button-trigger"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  // Desktop, or already connected on any platform
  return <WalletMultiButton />;
};
