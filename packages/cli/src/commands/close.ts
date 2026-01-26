import { Command } from 'commander';
import { Keypair } from '@solana/web3.js';
import { RentReclaimer, formatSol } from '@solreclaimer/core';
import * as fs from 'fs';
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';

interface CloseOptions {
  rpc: string;
  batchSize: string;
  dryRun?: boolean;
  yes?: boolean;
}

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export const closeCommand = new Command('close')
  .description('Close empty token accounts and reclaim SOL')
  .argument('<keypair>', 'Path to keypair JSON file')
  .option('-r, --rpc <url>', 'RPC endpoint URL', 'https://api.mainnet-beta.solana.com')
  .option('-b, --batch-size <number>', 'Accounts per transaction', '20')
  .option('--dry-run', 'Simulate without executing')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (keypairPath: string, options: CloseOptions) => {
    try {
      // Load keypair
      if (!fs.existsSync(keypairPath)) {
        console.error(chalk.red('Keypair file not found:'), keypairPath);
        process.exit(1);
      }

      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
      const walletAddress = keypair.publicKey.toBase58();

      console.log('\n' + chalk.bold('SolReclaimer'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.cyan('Wallet:')} ${walletAddress}`);
      console.log(`${chalk.cyan('RPC:')} ${options.rpc}`);
      if (options.dryRun) {
        console.log(chalk.yellow('Mode: DRY RUN (no transactions will be sent)'));
      }

      // Scan wallet
      const scanSpinner = ora('Scanning for closeable accounts...').start();
      const reclaimer = new RentReclaimer({ rpcEndpoint: options.rpc });
      const scanResult = await reclaimer.scan(walletAddress);
      scanSpinner.stop();

      if (scanResult.closeableAccounts.length === 0) {
        console.log(chalk.green('\nNo empty token accounts found. Your wallet is clean!'));
        return;
      }

      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.cyan('Empty accounts found:')} ${chalk.bold(scanResult.closeableAccounts.length.toString())}`);
      console.log(`${chalk.cyan('SOL to reclaim:')} ${chalk.bold.green(formatSol(scanResult.totalReclaimableLamports) + ' SOL')}`);

      const batchSize = parseInt(options.batchSize, 10);
      const totalBatches = Math.ceil(scanResult.closeableAccounts.length / batchSize);
      console.log(`${chalk.cyan('Transactions needed:')} ${totalBatches}`);
      console.log(chalk.gray('─'.repeat(50)));

      // Confirm
      if (!options.yes && !options.dryRun) {
        const confirmed = await confirm(
          chalk.yellow('\nProceed with closing accounts? (y/N): ')
        );
        if (!confirmed) {
          console.log(chalk.gray('Cancelled.'));
          return;
        }
      }

      // Execute
      console.log('');
      const progressSpinner = ora('Processing...').start();
      let currentBatch = 0;

      const result = await reclaimer.closeWithKeypair(
        keypair,
        scanResult.closeableAccounts,
        {
          batchSize,
          simulate: options.dryRun,
          onProgress: (current, total, signature) => {
            currentBatch = current;
            if (signature && !options.dryRun) {
              progressSpinner.text = `Batch ${current}/${total} confirmed: ${signature.slice(0, 20)}...`;
            } else {
              progressSpinner.text = `Processing batch ${current}/${total}...`;
            }
          },
        }
      );

      progressSpinner.stop();

      // Results
      console.log('\n' + chalk.bold('Results'));
      console.log(chalk.gray('─'.repeat(50)));

      if (result.success) {
        if (options.dryRun) {
          console.log(chalk.blue('DRY RUN COMPLETE'));
          console.log(`Would close: ${result.closedCount} accounts`);
          console.log(`Would reclaim: ${formatSol(result.reclaimedLamports)} SOL`);
        } else {
          console.log(chalk.green('SUCCESS!'));
          console.log(`${chalk.cyan('Accounts closed:')} ${result.closedCount}`);
          console.log(`${chalk.cyan('SOL reclaimed:')} ${chalk.bold.green(formatSol(result.reclaimedLamports) + ' SOL')}`);
          console.log(`${chalk.cyan('Transactions:')} ${result.signatures.length}`);

          console.log('\n' + chalk.bold('Transaction Signatures:'));
          result.signatures.forEach((sig, i) => {
            console.log(chalk.gray(`  ${i + 1}.`) + ` ${sig}`);
          });
        }
      } else {
        console.log(chalk.yellow('PARTIAL SUCCESS'));
        console.log(`${chalk.cyan('Accounts closed:')} ${result.closedCount}`);
        console.log(`${chalk.cyan('Accounts failed:')} ${result.failedCount}`);
        console.log(`${chalk.cyan('SOL reclaimed:')} ${formatSol(result.reclaimedLamports)} SOL`);

        if (result.errors.length > 0) {
          console.log('\n' + chalk.red('Errors:'));
          result.errors.forEach(({ batchIndex, error }) => {
            console.log(chalk.red(`  Batch ${batchIndex + 1}: ${error}`));
          });
        }
      }

      console.log('');

    } catch (error) {
      console.error(chalk.red('\nError:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
