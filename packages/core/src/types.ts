import { PublicKey, TransactionSignature } from '@solana/web3.js';

export interface TokenAccountInfo {
  pubkey: PublicKey;
  mint: PublicKey;
  owner: PublicKey;
  amount: bigint;
  decimals: number;
  rentLamports: number;
  isCloseable: boolean;
  symbol?: string;
  name?: string;
}

export interface ScanResult {
  totalAccounts: number;
  closeableAccounts: TokenAccountInfo[];
  nonCloseableAccounts: TokenAccountInfo[];
  totalReclaimableLamports: number;
  totalReclaimableSol: number;
}

export interface CloseAccountsOptions {
  accounts: TokenAccountInfo[];
  batchSize?: number;
  onBatchStart?: (batchIndex: number, totalBatches: number) => void;
  onBatchComplete?: (batchIndex: number, signature: TransactionSignature) => void;
  onBatchError?: (batchIndex: number, error: Error) => void;
  simulate?: boolean;
}

export interface CloseAccountsResult {
  success: boolean;
  closedCount: number;
  failedCount: number;
  reclaimedLamports: number;
  reclaimedSol: number;
  signatures: TransactionSignature[];
  errors: Array<{ batchIndex: number; error: string }>;
}

export interface RentReclaimerConfig {
  rpcEndpoint?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  connection?: import('@solana/web3.js').Connection;
}

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const TOKEN_ACCOUNT_RENT = 2039280; // ~0.00203928 SOL
