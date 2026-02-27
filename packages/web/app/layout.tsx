import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { LazyProviders } from '@/components/LazyProviders';
import { ToolLayout } from '@/components/ToolLayout';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  themeColor: '#9945FF',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://soltools.net'),
  title: 'SolTools - Solana Tools',
  description: 'Free Solana tools. Reclaim SOL, burn & lock tokens, scan tokens, X-Ray wallets, and more. No fees, no tracking.',
  keywords: ['Solana', 'rent', 'reclaim', 'token accounts', 'SOL', 'free', 'SolTools', 'SolReclaimer', 'vanity wallet'],
  authors: [{ name: 'Dequavious' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SolTools',
    description: 'Free Solana tools. Reclaim SOL, burn & lock tokens, scan tokens, X-Ray wallets, and more.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SolTools',
    description: 'Free Solana tools. No fees, no tracking, no compromise.',
    images: ['/og-image.png'],
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
        <link rel="icon" href="/icon-32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.mainnet-beta.solana.com" />
      </head>
      <body className={spaceGrotesk.className}>
        <LazyProviders>
          <ToolLayout>
            {children}
          </ToolLayout>
        </LazyProviders>
      </body>
    </html>
  );
}
