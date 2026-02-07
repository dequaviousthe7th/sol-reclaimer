import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  TransactionSignature,
  SendOptions,
  Signer,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { TransactionBuilder } from './builder';
import {
  TokenAccountInfo,
  CloseAccountsOptions,
  CloseAccountsResult,
  CloseWithALTOptions,
  CloseWithALTResult,
  ClosePhase,
  LAMPORTS_PER_SOL,
} from './types';

export type SignTransactionFn<T extends Transaction | VersionedTransaction> = (
  transaction: T
) => Promise<T>;

export type SignAllTransactionsFn<T extends Transaction | VersionedTransaction> = (
  transactions: T[]
) => Promise<T[]>;

export class TransactionExecutor {
  private connection: Connection;
  private builder: TransactionBuilder;

  constructor(connection: Connection) {
    this.connection = connection;
    this.builder = new TransactionBuilder(connection);
  }

  async closeAccountsWithKeypair(
    accounts: TokenAccountInfo[],
    payer: Keypair,
    options: Omit<CloseAccountsOptions, 'accounts'> = {}
  ): Promise<CloseAccountsResult> {
    const {
      batchSize = 20,
      onBatchStart,
      onBatchComplete,
      onBatchError,
      simulate = false,
    } = options;

    const transactions = await this.builder.buildLegacyCloseTransactions(
      accounts,
      payer.publicKey,
      payer.publicKey,
      payer.publicKey,
      batchSize
    );

    return this.executeTransactions(
      transactions,
      async (tx) => {
        tx.sign(payer);
        return tx;
      },
      accounts,
      { onBatchStart, onBatchComplete, onBatchError, simulate }
    );
  }

  async closeAccountsWithWallet(
    accounts: TokenAccountInfo[],
    walletPublicKey: PublicKey,
    signAllTransactions: SignAllTransactionsFn<Transaction>,
    options: Omit<CloseAccountsOptions, 'accounts'> = {}
  ): Promise<CloseAccountsResult> {
    const {
      batchSize = 20,
      onBatchStart,
      onBatchComplete,
      onBatchError,
      simulate = false,
    } = options;

    console.log('Executor: Building transactions for', accounts.length, 'accounts');

    const transactions = await this.builder.buildLegacyCloseTransactions(
      accounts,
      walletPublicKey,
      walletPublicKey,
      walletPublicKey,
      batchSize
    );

    console.log('Executor: Built', transactions.length, 'transactions');

    // Sign all transactions at once with wallet
    console.log('Executor: Requesting wallet signature...');
    const signedTransactions = await signAllTransactions(transactions);
    console.log('Executor: Got', signedTransactions.length, 'signed transactions');

    return this.executeSigned(
      signedTransactions,
      accounts,
      { onBatchStart, onBatchComplete, onBatchError, simulate }
    );
  }

  private async executeTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
    signFn: SignTransactionFn<T>,
    accounts: TokenAccountInfo[],
    options: {
      onBatchStart?: (batchIndex: number, totalBatches: number) => void;
      onBatchComplete?: (batchIndex: number, signature: TransactionSignature) => void;
      onBatchError?: (batchIndex: number, error: Error) => void;
      simulate?: boolean;
    }
  ): Promise<CloseAccountsResult> {
    const { onBatchStart, onBatchComplete, onBatchError, simulate } = options;
    const totalBatches = transactions.length;
    const signatures: TransactionSignature[] = [];
    const errors: Array<{ batchIndex: number; error: string }> = [];
    let closedCount = 0;
    const batchSize = Math.ceil(accounts.length / totalBatches);

    for (let i = 0; i < transactions.length; i++) {
      onBatchStart?.(i, totalBatches);

      try {
        const signedTx = await signFn(transactions[i]);

        if (simulate) {
          if (signedTx instanceof VersionedTransaction) {
            await this.connection.simulateTransaction(signedTx);
          } else {
            await this.connection.simulateTransaction(signedTx as Transaction);
          }
          signatures.push(`simulated-${i}`);
          closedCount += Math.min(batchSize, accounts.length - i * batchSize);
        } else {
          const signature = await this.sendAndConfirm(signedTx);
          signatures.push(signature);
          closedCount += Math.min(batchSize, accounts.length - i * batchSize);
          onBatchComplete?.(i, signature);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ batchIndex: i, error: errorMessage });
        onBatchError?.(i, error instanceof Error ? error : new Error(errorMessage));
      }
    }

    const reclaimedLamports = accounts
      .slice(0, closedCount)
      .reduce((sum, acc) => sum + acc.rentLamports, 0);

    return {
      success: errors.length === 0,
      closedCount,
      failedCount: accounts.length - closedCount,
      reclaimedLamports,
      reclaimedSol: reclaimedLamports / LAMPORTS_PER_SOL,
      signatures,
      errors,
    };
  }

  private async executeSigned<T extends Transaction | VersionedTransaction>(
    signedTransactions: T[],
    accounts: TokenAccountInfo[],
    options: {
      onBatchStart?: (batchIndex: number, totalBatches: number) => void;
      onBatchComplete?: (batchIndex: number, signature: TransactionSignature) => void;
      onBatchError?: (batchIndex: number, error: Error) => void;
      simulate?: boolean;
    }
  ): Promise<CloseAccountsResult> {
    const { onBatchStart, onBatchComplete, onBatchError, simulate } = options;
    const totalBatches = signedTransactions.length;
    const signatures: TransactionSignature[] = [];
    const errors: Array<{ batchIndex: number; error: string }> = [];
    let closedCount = 0;
    const batchSize = Math.ceil(accounts.length / totalBatches);

    for (let i = 0; i < signedTransactions.length; i++) {
      onBatchStart?.(i, totalBatches);

      try {
        const signedTx = signedTransactions[i];

        if (simulate) {
          if (signedTx instanceof VersionedTransaction) {
            await this.connection.simulateTransaction(signedTx);
          } else {
            await this.connection.simulateTransaction(signedTx as Transaction);
          }
          signatures.push(`simulated-${i}`);
          closedCount += Math.min(batchSize, accounts.length - i * batchSize);
        } else {
          const signature = await this.sendAndConfirm(signedTx);
          signatures.push(signature);
          closedCount += Math.min(batchSize, accounts.length - i * batchSize);
          onBatchComplete?.(i, signature);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ batchIndex: i, error: errorMessage });
        onBatchError?.(i, error instanceof Error ? error : new Error(errorMessage));
      }
    }

    const reclaimedLamports = accounts
      .slice(0, closedCount)
      .reduce((sum, acc) => sum + acc.rentLamports, 0);

    return {
      success: errors.length === 0,
      closedCount,
      failedCount: accounts.length - closedCount,
      reclaimedLamports,
      reclaimedSol: reclaimedLamports / LAMPORTS_PER_SOL,
      signatures,
      errors,
    };
  }

  private async sendAndConfirm<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<TransactionSignature> {
    const sendOptions: SendOptions = {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    };

    let signature: TransactionSignature;

    if (transaction instanceof VersionedTransaction) {
      signature = await this.connection.sendTransaction(transaction, sendOptions);
    } else {
      signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        sendOptions
      );
    }

    const confirmation = await this.connection.confirmTransaction(
      signature,
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
  }

  async simulateClose(
    accounts: TokenAccountInfo[],
    walletPublicKey: PublicKey
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const transactions = await this.builder.buildLegacyCloseTransactions(
        accounts.slice(0, 1), // Just test with one account
        walletPublicKey,
        walletPublicKey,
        walletPublicKey,
        1
      );

      if (transactions.length === 0) {
        return { success: true };
      }

      const result = await this.connection.simulateTransaction(transactions[0]);

      if (result.value.err) {
        return { success: false, error: JSON.stringify(result.value.err) };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * ALT-aware close flow with automatic fallback to legacy transactions.
   * For <= 5 accounts, skips ALT and uses legacy with small batch.
   */
  async closeAccountsWithWalletALT(
    accounts: TokenAccountInfo[],
    walletPublicKey: PublicKey,
    signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>,
    options: CloseWithALTOptions = {}
  ): Promise<CloseWithALTResult> {
    const { batchSize, simulate = false, onPhase, onProgress } = options;

    // Small account optimization: skip ALT for <= 5 accounts
    if (accounts.length <= 5) {
      return this.closeWithLegacyFallback(
        accounts, walletPublicKey, signAllTransactions, batchSize ?? 5, simulate, onPhase, onProgress
      );
    }

    try {
      // Phase 1: Build ALT setup transactions
      onPhase?.('building-alt');
      const { transactions: altSetupTxs, altAddress } =
        await this.builder.buildALTSetupTransactions(accounts, walletPublicKey);

      // Phase 2: Sign ALT setup transactions
      onPhase?.('signing-alt');
      const signedAltTxs = await signAllTransactions(altSetupTxs);

      // Phase 3: Send and confirm ALT setup transactions
      onPhase?.('confirming-alt');
      for (const signedTx of signedAltTxs) {
        await this.sendAndConfirm(signedTx);
      }

      // Phase 4: Wait for ALT activation
      onPhase?.('waiting-alt');
      const altAccount = await this.waitForALTActivation(altAddress);

      // Phase 5: Build close transactions with ALT
      onPhase?.('building-close');
      const closeBatchSize = batchSize ?? 15;
      const closeTxs = await this.builder.buildCloseTransactionsWithALT(
        accounts, walletPublicKey, walletPublicKey, walletPublicKey,
        altAccount, altAddress, closeBatchSize,
      );

      // Phase 6: Sign close transactions
      onPhase?.('signing-close');
      const signedCloseTxs = await signAllTransactions(closeTxs);

      // Phase 7: Send and confirm close transactions
      onPhase?.('confirming-close');
      const result = await this.executeSigned(
        signedCloseTxs, accounts, {
          onBatchStart: (index, total) => onProgress?.(index + 1, total),
          onBatchComplete: (index, signature) => onProgress?.(index + 1, signedCloseTxs.length, signature),
          simulate,
        }
      );

      return { ...result, altAddress: altAddress.toBase58(), usedALT: true };

    } catch (altError) {
      console.warn('ALT setup failed, falling back to legacy transactions:', altError);
      onPhase?.('fallback-legacy');
      return this.closeWithLegacyFallback(
        accounts, walletPublicKey, signAllTransactions, batchSize ?? 10, simulate, onPhase, onProgress
      );
    }
  }

  private async closeWithLegacyFallback(
    accounts: TokenAccountInfo[],
    walletPublicKey: PublicKey,
    signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]>,
    fallbackBatchSize: number,
    simulate: boolean,
    onPhase?: (phase: ClosePhase) => void,
    onProgress?: (current: number, total: number, signature?: string) => void,
  ): Promise<CloseWithALTResult> {
    onPhase?.('building-close');
    const legacyTxs = await this.builder.buildLegacyCloseTransactions(
      accounts, walletPublicKey, walletPublicKey, walletPublicKey, fallbackBatchSize,
    );

    onPhase?.('signing-close');
    const signedLegacyTxs = await signAllTransactions(legacyTxs);

    onPhase?.('confirming-close');
    const result = await this.executeSigned(
      signedLegacyTxs, accounts, {
        onBatchStart: (index, total) => onProgress?.(index + 1, total),
        onBatchComplete: (index, signature) => onProgress?.(index + 1, signedLegacyTxs.length, signature),
        simulate,
      }
    );

    return { ...result, usedALT: false };
  }

  /**
   * Poll until the ALT is active and has addresses populated.
   */
  private async waitForALTActivation(
    altAddress: PublicKey,
    maxWaitMs: number = 15_000,
  ): Promise<AddressLookupTableAccount> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const response = await this.connection.getAddressLookupTable(altAddress);
      if (response.value && response.value.isActive()) {
        return response.value;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('ALT activation timed out');
  }
}
