import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AccountScanner } from './scanner';
import { TransactionBuilder } from './builder';
import { TransactionExecutor, SignAllTransactionsFn } from './executor';
import {
  RentReclaimerConfig,
  ScanResult,
  CloseAccountsResult,
  CloseWithALTOptions,
  CloseWithALTResult,
  TokenAccountInfo,
  LAMPORTS_PER_SOL,
  TOKEN_ACCOUNT_RENT,
} from './types';
import type { Transaction, VersionedTransaction } from '@solana/web3.js';

export class RentReclaimer {
  private connection: Connection;
  private scanner: AccountScanner;
  private builder: TransactionBuilder;
  private executor: TransactionExecutor;

  constructor(config: RentReclaimerConfig) {
    if (config.connection) {
      this.connection = config.connection;
    } else if (config.rpcEndpoint) {
      this.connection = new Connection(config.rpcEndpoint, {
        commitment: config.commitment ?? 'confirmed',
      });
    } else {
      throw new Error('Either connection or rpcEndpoint must be provided');
    }
    this.scanner = new AccountScanner(this.connection);
    this.builder = new TransactionBuilder(this.connection);
    this.executor = new TransactionExecutor(this.connection);
  }

  async scan(walletAddress: string | PublicKey): Promise<ScanResult> {
    const pubkey = typeof walletAddress === 'string'
      ? new PublicKey(walletAddress)
      : walletAddress;
    return this.scanner.scanWallet(pubkey);
  }

  async closeWithKeypair(
    keypair: Keypair,
    accounts?: TokenAccountInfo[],
    options?: {
      batchSize?: number;
      simulate?: boolean;
      onProgress?: (current: number, total: number, signature?: string) => void;
    }
  ): Promise<CloseAccountsResult> {
    const targetAccounts = accounts ?? (await this.scan(keypair.publicKey)).closeableAccounts;

    if (targetAccounts.length === 0) {
      return {
        success: true,
        closedCount: 0,
        failedCount: 0,
        reclaimedLamports: 0,
        reclaimedSol: 0,
        signatures: [],
        errors: [],
      };
    }

    return this.executor.closeAccountsWithKeypair(targetAccounts, keypair, {
      batchSize: options?.batchSize,
      simulate: options?.simulate,
      onBatchStart: (index, total) => {
        options?.onProgress?.(index + 1, total);
      },
      onBatchComplete: (index, signature) => {
        options?.onProgress?.(index + 1, this.builder.calculateTotalBatches(targetAccounts.length), signature);
      },
    });
  }

  async closeWithWallet(
    walletPublicKey: string | PublicKey,
    signAllTransactions: SignAllTransactionsFn<Transaction>,
    accounts?: TokenAccountInfo[],
    options?: {
      batchSize?: number;
      simulate?: boolean;
      onProgress?: (current: number, total: number, signature?: string) => void;
    }
  ): Promise<CloseAccountsResult> {
    const pubkey = typeof walletPublicKey === 'string'
      ? new PublicKey(walletPublicKey)
      : walletPublicKey;

    const targetAccounts = accounts ?? (await this.scan(pubkey)).closeableAccounts;

    if (targetAccounts.length === 0) {
      return {
        success: true,
        closedCount: 0,
        failedCount: 0,
        reclaimedLamports: 0,
        reclaimedSol: 0,
        signatures: [],
        errors: [],
      };
    }

    return this.executor.closeAccountsWithWallet(
      targetAccounts,
      pubkey,
      signAllTransactions,
      {
        batchSize: options?.batchSize,
        simulate: options?.simulate,
        onBatchStart: (index, total) => {
          options?.onProgress?.(index + 1, total);
        },
        onBatchComplete: (index, signature) => {
          options?.onProgress?.(index + 1, this.builder.calculateTotalBatches(targetAccounts.length), signature);
        },
      }
    );
  }

  async closeWithWalletALT(
    walletPublicKey: string | PublicKey,
    signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>,
    accounts?: TokenAccountInfo[],
    options?: CloseWithALTOptions,
  ): Promise<CloseWithALTResult> {
    const pubkey = typeof walletPublicKey === 'string'
      ? new PublicKey(walletPublicKey)
      : walletPublicKey;

    const targetAccounts = accounts ?? (await this.scan(pubkey)).closeableAccounts;

    if (targetAccounts.length === 0) {
      return {
        success: true,
        closedCount: 0,
        failedCount: 0,
        reclaimedLamports: 0,
        reclaimedSol: 0,
        signatures: [],
        errors: [],
        usedALT: false,
      };
    }

    return this.executor.closeAccountsWithWalletALT(
      targetAccounts,
      pubkey,
      signAllTransactions,
      {
        batchSize: options?.batchSize,
        simulate: options?.simulate,
        onPhase: options?.onPhase,
        onProgress: options?.onProgress,
      }
    );
  }

  async simulate(
    walletAddress: string | PublicKey,
    accounts?: TokenAccountInfo[]
  ): Promise<{ success: boolean; error?: string }> {
    const pubkey = typeof walletAddress === 'string'
      ? new PublicKey(walletAddress)
      : walletAddress;

    const targetAccounts = accounts ?? (await this.scan(pubkey)).closeableAccounts;

    if (targetAccounts.length === 0) {
      return { success: true };
    }

    return this.executor.simulateClose(targetAccounts, pubkey);
  }

  getConnection(): Connection {
    return this.connection;
  }
}

// Re-export types and utilities
export * from './types';
export { AccountScanner } from './scanner';
export { TransactionBuilder } from './builder';
export { TransactionExecutor } from './executor';
export type { SignAllTransactionsFn, SignTransactionFn } from './executor';

// Utility functions
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function formatSol(lamports: number, decimals: number = 6): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(decimals);
}
