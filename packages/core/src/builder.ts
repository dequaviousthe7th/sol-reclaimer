import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { TokenAccountInfo } from './types';

export class TransactionBuilder {
  private connection: Connection;
  private defaultBatchSize: number = 20;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  createCloseInstructions(
    accounts: TokenAccountInfo[],
    destination: PublicKey,
    authority: PublicKey
  ): TransactionInstruction[] {
    return accounts.map((account) => {
      const programId = this.getProgramIdForAccount(account);
      return createCloseAccountInstruction(
        account.pubkey,
        destination,
        authority,
        [],
        programId
      );
    });
  }

  private getProgramIdForAccount(account: TokenAccountInfo): PublicKey {
    // Default to TOKEN_PROGRAM_ID, could be extended to detect Token-2022
    return TOKEN_PROGRAM_ID;
  }

  async buildCloseTransactions(
    accounts: TokenAccountInfo[],
    payer: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    batchSize: number = this.defaultBatchSize
  ): Promise<VersionedTransaction[]> {
    const batches = this.batchAccounts(accounts, batchSize);
    const transactions: VersionedTransaction[] = [];

    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash('confirmed');

    for (const batch of batches) {
      const instructions: TransactionInstruction[] = [
        // Add compute budget for safety
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        }),
      ];

      const closeInstructions = this.createCloseInstructions(
        batch,
        destination,
        authority
      );
      instructions.push(...closeInstructions);

      const messageV0 = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      transactions.push(transaction);
    }

    return transactions;
  }

  async buildLegacyCloseTransactions(
    accounts: TokenAccountInfo[],
    payer: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    batchSize: number = this.defaultBatchSize
  ): Promise<Transaction[]> {
    const batches = this.batchAccounts(accounts, batchSize);
    const transactions: Transaction[] = [];

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    for (const batch of batches) {
      const transaction = new Transaction();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      // Add compute budget
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200_000,
        })
      );

      const closeInstructions = this.createCloseInstructions(
        batch,
        destination,
        authority
      );
      closeInstructions.forEach((ix) => transaction.add(ix));

      transactions.push(transaction);
    }

    return transactions;
  }

  private batchAccounts(
    accounts: TokenAccountInfo[],
    batchSize: number
  ): TokenAccountInfo[][] {
    const batches: TokenAccountInfo[][] = [];
    for (let i = 0; i < accounts.length; i += batchSize) {
      batches.push(accounts.slice(i, i + batchSize));
    }
    return batches;
  }

  calculateTotalBatches(accountCount: number, batchSize: number = this.defaultBatchSize): number {
    return Math.ceil(accountCount / batchSize);
  }
}
