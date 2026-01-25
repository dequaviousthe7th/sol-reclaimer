import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sol Rent Reclaimer - Free Solana Account Closer',
  description: 'Close empty Solana token accounts and reclaim your SOL. Zero fees, open source.',
  keywords: ['Solana', 'rent', 'reclaim', 'token accounts', 'SOL', 'free'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
