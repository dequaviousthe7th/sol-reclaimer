'use client';

import { useEffect, useRef } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonInnerProps {
  autoOpen?: boolean;
}

export const WalletButtonInner = ({ autoOpen }: WalletButtonInnerProps) => {
  const { setVisible } = useWalletModal();
  const hasAutoOpened = useRef(false);

  // Auto-open modal if user clicked before providers loaded
  useEffect(() => {
    if (autoOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      // Small delay to ensure modal provider is ready
      const timer = setTimeout(() => {
        setVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoOpen, setVisible]);

  return <WalletMultiButton />;
};
