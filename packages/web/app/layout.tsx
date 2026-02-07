import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { LazyProviders } from '@/components/LazyProviders';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  themeColor: '#9945FF',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://solreclaimer.net'),
  title: 'SolReclaimer - Reclaim Your Locked SOL',
  description: 'Close empty Solana token accounts and reclaim your SOL. Zero fees, open source.',
  keywords: ['Solana', 'rent', 'reclaim', 'token accounts', 'SOL', 'free', 'SolReclaimer'],
  authors: [{ name: 'Dequavious' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SolReclaimer',
    description: 'Close empty Solana token accounts and reclaim your SOL. Zero fees.',
    type: 'website',
    images: [{ url: '/icon-512.png', width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mainnet-beta.solana.com" />
      </head>
      <body className={spaceGrotesk.className}>
        <LazyProviders>
          {children}
        </LazyProviders>
      </body>
    </html>
  );
}
