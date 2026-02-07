import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  AddressLookupTableProgram,
  AddressLookupTableAccount,
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
    return account.programId;
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

  /**
   * Build transaction(s) to create and populate an Address Lookup Table.
   * Returns legacy Transaction[] (ALT doesn't exist yet) + the ALT address.
   */
  async buildALTSetupTransactions(
    accounts: TokenAccountInfo[],
    payer: PublicKey,
  ): Promise<{ transactions: Transaction[]; altAddress: PublicKey }> {
    const slot = await this.connection.getSlot('finalized');

    const [createIx, altAddress] = AddressLookupTableProgram.createLookupTable({
      authority: payer,
      payer: payer,
      recentSlot: slot,
    });

    // Collect all unique addresses for the ALT
    const addressSet = new Set<string>();
    addressSet.add(payer.toBase58());
    addressSet.add(TOKEN_PROGRAM_ID.toBase58());
    addressSet.add(TOKEN_2022_PROGRAM_ID.toBase58());
    for (const account of accounts) {
      addressSet.add(account.pubkey.toBase58());
    }
    const allAddresses = [...addressSet].map(a => new PublicKey(a));

    const FIRST_CHUNK_SIZE = 20;
    const EXTEND_CHUNK_SIZE = 30;

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const transactions: Transaction[] = [];

    // Tx 1: create + first extend
    const firstChunk = allAddresses.slice(0, FIRST_CHUNK_SIZE);
    const tx1 = new Transaction();
    tx1.recentBlockhash = blockhash;
    tx1.feePayer = payer;
    tx1.add(createIx);
    tx1.add(AddressLookupTableProgram.extendLookupTable({
      lookupTable: altAddress,
      authority: payer,
      payer: payer,
      addresses: firstChunk,
    }));
    transactions.push(tx1);

    // Remaining addresses in subsequent txs
    let offset = FIRST_CHUNK_SIZE;
    while (offset < allAddresses.length) {
      const chunk = allAddresses.slice(offset, offset + EXTEND_CHUNK_SIZE);
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer;
      tx.add(AddressLookupTableProgram.extendLookupTable({
        lookupTable: altAddress,
        authority: payer,
        payer: payer,
        addresses: chunk,
      }));
      transactions.push(tx);
      offset += EXTEND_CHUNK_SIZE;
    }

    return { transactions, altAddress };
  }

  /**
   * Build close transactions as v0 VersionedTransaction referencing an ALT.
   * Appends a deactivateLookupTable instruction to the last transaction.
   */
  async buildCloseTransactionsWithALT(
    accounts: TokenAccountInfo[],
    payer: PublicKey,
    destination: PublicKey,
    authority: PublicKey,
    altAccount: AddressLookupTableAccount,
    altAddress: PublicKey,
    batchSize: number = 15,
  ): Promise<VersionedTransaction[]> {
    const batches = this.batchAccounts(accounts, batchSize);
    const transactions: VersionedTransaction[] = [];

    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    for (let i = 0; i < batches.length; i++) {
      const instructions: TransactionInstruction[] = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ];

      const closeInstructions = this.createCloseInstructions(
        batches[i], destination, authority
      );
      instructions.push(...closeInstructions);

      // Deactivate the ALT in the last transaction for cleanup
      if (i === batches.length - 1) {
        instructions.push(
          AddressLookupTableProgram.deactivateLookupTable({
            lookupTable: altAddress,
            authority: authority,
          })
        );
      }

      const messageV0 = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message([altAccount]);

      transactions.push(new VersionedTransaction(messageV0));
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
