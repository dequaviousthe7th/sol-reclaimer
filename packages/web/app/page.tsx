'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { RentReclaimer } from '@/components/RentReclaimer';

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-solana-purple to-solana-green" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
              Sol Rent Reclaimer
            </h1>
          </div>
          <WalletMultiButton />
        </header>

        {/* Hero Section */}
        {!connected && (
          <section className="text-center py-20">
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Reclaim Your SOL
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Close empty token accounts and get back your rent deposits.
              <span className="text-solana-green font-semibold"> Zero fees</span>,
              <span className="text-solana-purple font-semibold"> open source</span>.
            </p>

            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-12 mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-solana-green">0%</div>
                <div className="text-sm text-gray-500">Fees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-solana-purple">~0.002</div>
                <div className="text-sm text-gray-500">SOL per account</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">100%</div>
                <div className="text-sm text-gray-500">Yours to keep</div>
              </div>
            </div>

            <div className="gradient-border inline-block">
              <div className="px-8 py-4">
                <WalletMultiButton />
              </div>
            </div>

            <div className="mt-16 grid md:grid-cols-3 gap-6 text-left">
              <FeatureCard
                number="1"
                title="Connect Wallet"
                description="Connect your Solana wallet (Phantom, Solflare, etc.)"
              />
              <FeatureCard
                number="2"
                title="Scan Accounts"
                description="We'll find all empty token accounts holding your SOL"
              />
              <FeatureCard
                number="3"
                title="Reclaim SOL"
                description="Close accounts and get your rent deposits back instantly"
              />
            </div>
          </section>
        )}

        {/* Main App */}
        {connected && <RentReclaimer />}

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p className="mb-2">
            Open source and free forever. No fees, no catches.
          </p>
          <p>
            <a
              href="https://github.com/dequaviousthe7th/sol-rent-reclaimer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-solana-purple hover:text-solana-green transition-colors"
            >
              View on GitHub
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-solana-purple/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-solana-purple/20 text-solana-purple flex items-center justify-center font-bold mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
