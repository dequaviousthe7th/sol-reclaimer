'use client';

import { FC, ReactNode, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import '@solana/wallet-adapter-react-ui/styles.css';

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: FC<ProvidersProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const endpoint = useMemo(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL;
    if (workerUrl) return `${workerUrl}/api/rpc`;
    return process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }, []);

  const wallets = useMemo(() => [], []);

  // Render children immediately for fast initial paint
  // Wallet functionality will hydrate when ready
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
