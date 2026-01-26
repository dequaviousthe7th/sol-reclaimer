import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#9945FF',
};

export const metadata: Metadata = {
  title: 'SolReclaimer - Free Solana Account Closer',
  description: 'Close empty Solana token accounts and reclaim your SOL. Zero fees, open source.',
  keywords: ['Solana', 'rent', 'reclaim', 'token accounts', 'SOL', 'free', 'SolReclaimer'],
  authors: [{ name: 'Dequavious' }],
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SolReclaimer',
    description: 'Close empty Solana token accounts and reclaim your SOL. Zero fees.',
    type: 'website',
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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className={spaceGrotesk.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
