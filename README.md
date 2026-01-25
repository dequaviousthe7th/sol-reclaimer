# Sol Rent Reclaimer

**Zero-fee Solana rent reclaimer** - Close empty token accounts and reclaim your SOL. No fees, open source.

## Why?

Every token account on Solana holds ~0.00203 SOL in rent. When you swap, trade, or receive airdrops, these accounts accumulate. Even after transferring tokens out, the empty accounts remain, holding your SOL hostage.

**Sol Rent Reclaimer** helps you close these empty accounts and get your SOL back - completely free.

## Features

- **Zero fees** - Unlike other tools that take 5-10%, we take nothing
- **CLI + Web** - Use the command line or our web interface
- **Batch processing** - Close up to 20 accounts per transaction
- **Safe** - Only closes accounts with zero balance
- **Open source** - Fully auditable code
- **Self-hostable** - Run the web app yourself

## Quick Start

### Web App

Visit the deployed web app (or run locally):

```bash
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

# Build
pnpm build

# Scan for empty accounts
pnpm --filter cli start scan <YOUR_WALLET_ADDRESS>
# or with keypair file:
pnpm --filter cli start scan ./path/to/keypair.json

# Close empty accounts (requires keypair)
pnpm --filter cli start close ./path/to/keypair.json

# Dry run (simulate without executing)
pnpm --filter cli start close ./path/to/keypair.json --dry-run
```

## CLI Commands

### `scan`

Scan a wallet for closeable token accounts.

```bash
sol-reclaim scan <wallet> [options]

Arguments:
  wallet          Wallet address or path to keypair JSON

Options:
  -r, --rpc <url>  RPC endpoint (default: mainnet)
  --json           Output as JSON
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

## Project Structure

```
sol-rent-reclaimer/
├── packages/
│   ├── core/       # Shared library (scanner, transaction builder)
│   ├── cli/        # Command-line interface
│   └── web/        # Next.js web application
├── PPlan/          # Project planning docs
└── README.md
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run web app in dev mode
pnpm dev:web

# Run CLI in dev mode
pnpm dev:cli
```

## How It Works

1. **Scan**: Uses `getParsedTokenAccountsByOwner` to find all token accounts
2. **Filter**: Identifies accounts with zero balance (closeable)
3. **Build**: Creates batched transactions with `closeAccount` instructions
4. **Execute**: Signs and sends transactions to close accounts
5. **Reclaim**: Rent SOL is returned to your wallet

## Security

- **No private keys on server** - Web app uses wallet adapter (client-side signing)
- **No backend required** - All operations use RPC directly
- **Transaction simulation** - All transactions are simulated before execution
- **Open source** - Audit the code yourself

## License

MIT - Use freely, no attribution required.

## Contributing

PRs welcome! Please open an issue first to discuss changes.
