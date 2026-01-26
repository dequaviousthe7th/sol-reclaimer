import { Command } from 'commander';
import { Keypair, PublicKey } from '@solana/web3.js';
import { RentReclaimer, formatSol } from '@solreclaimer/core';
import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';

interface ScanOptions {
  rpc: string;
  json?: boolean;
}

export const scanCommand = new Command('scan')
  .description('Scan wallet for closeable token accounts')
  .argument('<wallet>', 'Wallet address or path to keypair JSON file')
  .option('-r, --rpc <url>', 'RPC endpoint URL', 'https://api.mainnet-beta.solana.com')
  .option('--json', 'Output as JSON')
  .action(async (wallet: string, options: ScanOptions) => {
    const spinner = ora('Scanning wallet...').start();

    try {
      let walletAddress: string;

      // Check if wallet is a file path or an address
      if (fs.existsSync(wallet)) {
        const keypairData = JSON.parse(fs.readFileSync(wallet, 'utf-8'));
        const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
        walletAddress = keypair.publicKey.toBase58();
      } else {
        // Validate it's a valid public key
        try {
          new PublicKey(wallet);
          walletAddress = wallet;
        } catch {
          spinner.fail('Invalid wallet address or keypair file');
          process.exit(1);
        }
      }

      const reclaimer = new RentReclaimer({ rpcEndpoint: options.rpc });
      const result = await reclaimer.scan(walletAddress);

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify({
          wallet: walletAddress,
          totalAccounts: result.totalAccounts,
          closeableAccounts: result.closeableAccounts.length,
          reclaimableSol: result.totalReclaimableSol,
          reclaimableLamports: result.totalReclaimableLamports,
          accounts: result.closeableAccounts.map(acc => ({
            pubkey: acc.pubkey.toBase58(),
            mint: acc.mint.toBase58(),
            rentLamports: acc.rentLamports,
            rentSol: formatSol(acc.rentLamports),
          })),
        }, null, 2));
        return;
      }

      console.log('\n' + chalk.bold('Scan Results'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.cyan('Wallet:')} ${walletAddress}`);
      console.log(`${chalk.cyan('Total Token Accounts:')} ${result.totalAccounts}`);
      console.log(`${chalk.cyan('Empty (Closeable):')} ${chalk.green(result.closeableAccounts.length)}`);
      console.log(`${chalk.cyan('With Balance:')} ${result.nonCloseableAccounts.length}`);
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold.green('Reclaimable SOL:')} ${formatSol(result.totalReclaimableLamports)} SOL`);
      console.log(`${chalk.gray('(')}${result.totalReclaimableLamports.toLocaleString()} lamports${chalk.gray(')')}`);

      if (result.closeableAccounts.length > 0) {
        console.log('\n' + chalk.bold('Closeable Accounts:'));
        result.closeableAccounts.slice(0, 10).forEach((acc, i) => {
          console.log(
            chalk.gray(`  ${i + 1}.`) +
            ` ${acc.pubkey.toBase58().slice(0, 20)}...` +
            chalk.gray(` (${formatSol(acc.rentLamports)} SOL)`)
          );
        });
        if (result.closeableAccounts.length > 10) {
          console.log(chalk.gray(`  ... and ${result.closeableAccounts.length - 10} more`));
        }
      }

      console.log('\n' + chalk.yellow('Run ') + chalk.bold('solreclaimer close <wallet>') + chalk.yellow(' to reclaim SOL'));

    } catch (error) {
      spinner.fail('Scan failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });
