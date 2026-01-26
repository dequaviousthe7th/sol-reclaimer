<p align="center">
  <img src="https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
</p>

<h1 align="center">SolReclaimer</h1>

<p align="center">
  <b>Zero-fee Solana rent reclaimer - Close empty token accounts and get your SOL back</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"/>
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"/>
  <img src="https://img.shields.io/badge/Fees-0%25-14F195.svg" alt="Zero Fees"/>
</p>

```
 ███████╗ ██████╗ ██╗     ██████╗ ███████╗ ██████╗██╗      █████╗ ██╗███╗   ███╗███████╗██████╗
 ██╔════╝██╔═══██╗██║     ██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██║████╗ ████║██╔════╝██╔══██╗
 ███████╗██║   ██║██║     ██████╔╝█████╗  ██║     ██║     ███████║██║██╔████╔██║█████╗  ██████╔╝
 ╚════██║██║   ██║██║     ██╔══██╗██╔══╝  ██║     ██║     ██╔══██║██║██║╚██╔╝██║██╔══╝  ██╔══██╗
 ███████║╚██████╔╝███████╗██║  ██║███████╗╚██████╗███████╗██║  ██║██║██║ ╚═╝ ██║███████╗██║  ██║
 ╚══════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝
                              Reclaim Your Locked SOL
```

---

## Overview

Every token account on Solana holds ~0.00203 SOL in rent. When you swap, trade, or receive airdrops, these accounts accumulate. Even after transferring tokens out, the empty accounts remain, holding your SOL hostage.

**SolReclaimer** helps you close these empty accounts and get your SOL back - completely free.

### Key Features

| Feature | Description |
|---------|-------------|
| **Zero Fees** | Unlike other tools that take 5-10%, we take nothing |
| **Web + CLI** | Use the web interface or command line |
| **Batch Processing** | Close up to 20 accounts per transaction |
| **Safe** | Only closes accounts with zero balance |
| **Non-Custodial** | Your keys never leave your wallet |
| **Open Source** | Fully auditable code |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      SOLRECLAIMER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌──────────────────┐         ┌──────────────────┐            │
│    │    WEB APP       │         │      CLI         │            │
│    │    (Next.js)     │         │   (Commander)    │            │
│    └────────┬─────────┘         └────────┬─────────┘            │
│             │                            │                      │
│             └────────────┬───────────────┘                      │
│                          ▼                                      │
│    ┌──────────────────────────────────────────────────┐         │
│    │                 CORE LIBRARY                     │         │
│    │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │         │
│    │  │   Scanner   │  │   Builder   │  │ Executor │  │         │
│    │  │  (Accounts) │──│    (Txs)    │──│  (Send)  │  │         │
│    │  └─────────────┘  └─────────────┘  └──────────┘  │         │
│    └──────────────────────────┬───────────────────────┘         │
│                               │                                 │
│                               ▼                                 │
│    ┌──────────────────────────────────────────────────┐         │
│    │              SOLANA BLOCKCHAIN                   │         │
│    │           RPC • Token Program • SPL              │         │
│    └──────────────────────────────────────────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Packages

| Package | Description |
|---------|-------------|
| **@solreclaimer/core** | Shared library - scanner, transaction builder, executor |
| **@solreclaimer/cli** | Command-line interface for power users |
| **@solreclaimer/web** | Next.js web application with wallet adapter |

---

## Quick Start

### Web App

Visit **[solreclaimer.net](https://solreclaimer.net)** or run locally:

```bash
# Clone the repository
git clone https://github.com/dequaviousthe7th/sol-rent-reclaimer.git
cd sol-rent-reclaimer

# Install dependencies
pnpm install

# Run the web app
pnpm dev:web
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet, and reclaim!

### CLI

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Scan for empty accounts
pnpm --filter cli start scan <YOUR_WALLET_ADDRESS>

# Close empty accounts (requires keypair)
pnpm --filter cli start close ./path/to/keypair.json

# Dry run (simulate without executing)
pnpm --filter cli start close ./path/to/keypair.json --dry-run
```

---

## How It Works

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  SCAN   │───►│ FILTER  │───►│  BUILD  │───►│ EXECUTE │───►│ RECLAIM │
│         │    │         │    │         │    │         │    │         │
│ Find    │    │ Zero    │    │ Batch   │    │ Sign &  │    │ SOL     │
│ Accounts│    │ Balance │    │ Txs     │    │ Send    │    │ Returns │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

1. **Scan** - Uses `getParsedTokenAccountsByOwner` to find all token accounts
2. **Filter** - Identifies accounts with zero balance (closeable)
3. **Build** - Creates batched transactions with `closeAccount` instructions
4. **Execute** - Signs and sends transactions to close accounts
5. **Reclaim** - Rent SOL (~0.00203 per account) returns to your wallet

---

## CLI Commands

### `scan`

Scan a wallet for closeable token accounts.

```bash
sol-reclaim scan <wallet> [options]

Arguments:
  wallet              Wallet address or path to keypair JSON

Options:
  -r, --rpc <url>     RPC endpoint (default: mainnet)
  --json              Output as JSON
```

### `close`

Close empty token accounts and reclaim SOL.

```bash
sol-reclaim close <keypair> [options]

Arguments:
  keypair              Path to keypair JSON file

Options:
  -r, --rpc <url>      RPC endpoint (default: mainnet)
  -b, --batch-size <n> Accounts per transaction (default: 20)
  --dry-run            Simulate without executing
  -y, --yes            Skip confirmation prompt
```

---

## Configuration

### Web App

Create `.env.local` in `packages/web/`:

```env
# Use a custom RPC (recommended for production)
NEXT_PUBLIC_RPC_URL=https://your-rpc-endpoint.com
```

### CLI

Pass RPC via `--rpc` flag:

```bash
sol-reclaim scan <wallet> --rpc https://your-rpc-endpoint.com
```

---

## Project Structure

```
sol-rent-reclaimer/
├── packages/
│   ├── core/                    # Shared library
│   │   ├── src/
│   │   │   ├── index.ts         # Main exports
│   │   │   ├── scanner.ts       # Token account scanner
│   │   │   ├── builder.ts       # Transaction builder
│   │   │   ├── executor.ts      # Transaction executor
│   │   │   └── types.ts         # TypeScript types
│   │   └── package.json
│   │
│   ├── cli/                     # Command-line interface
│   │   ├── src/
│   │   │   ├── index.ts         # CLI entry point
│   │   │   └── commands/
│   │   │       ├── scan.ts      # Scan command
│   │   │       └── close.ts     # Close command
│   │   └── package.json
│   │
│   └── web/                     # Next.js web application
│       ├── app/
│       │   ├── layout.tsx       # Root layout
│       │   ├── page.tsx         # Home page
│       │   └── globals.css      # Global styles
│       ├── components/
│       │   ├── ClientApp.tsx    # Main app component
│       │   ├── RentReclaimer.tsx # Reclaimer UI
│       │   ├── WalletButton.tsx # Wallet connect button
│       │   ├── Providers.tsx    # Wallet providers
│       │   ├── AccountList.tsx  # Token account list
│       │   └── TransactionProgress.tsx
│       ├── public/
│       │   ├── favicon.svg
│       │   ├── icon-192.png
│       │   └── manifest.json
│       └── package.json
│
├── turbo.json                   # Turborepo config
├── pnpm-workspace.yaml
└── README.md
```

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Runtime** | Node.js, TypeScript 5+ |
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **Blockchain** | Solana Web3.js, SPL Token |
| **Wallet** | Solana Wallet Adapter |
| **Build** | Turborepo, tsup, pnpm |

---

## Scripts Reference

```bash
# Installation
pnpm install              # Install all workspace dependencies

# Building
pnpm build                # Build all packages

# Development
pnpm dev:web              # Run web app in dev mode
pnpm dev:cli              # Run CLI in dev mode

# CLI Commands
pnpm --filter cli start scan <wallet>
pnpm --filter cli start close <keypair>
```

---

## Security

| Aspect | Implementation |
|--------|----------------|
| **No Private Keys on Server** | Web app uses wallet adapter (client-side signing) |
| **No Backend Required** | All operations use RPC directly |
| **Transaction Simulation** | All transactions simulated before execution |
| **Open Source** | Fully auditable code |
| **Non-Custodial** | Your keys never leave your wallet |

---

## Troubleshooting

### RPC Rate Limits

If you hit rate limits, use a dedicated RPC:

```bash
# CLI
sol-reclaim scan <wallet> --rpc https://your-rpc.com

# Web (.env.local)
NEXT_PUBLIC_RPC_URL=https://your-rpc.com
```

### Transaction Failures

- Ensure sufficient SOL for transaction fees (~0.000005 SOL per tx)
- Try reducing batch size with `--batch-size 10`
- Check RPC endpoint health

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Built by Dequavious</b>
</p>
