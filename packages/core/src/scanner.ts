import {
  Connection,
  PublicKey,
  AccountInfo,
  ParsedAccountData,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import {
  TokenAccountInfo,
  ScanResult,
  LAMPORTS_PER_SOL,
} from './types';

export class AccountScanner {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async scanWallet(walletAddress: PublicKey): Promise<ScanResult> {
    console.log('Scanner: Starting scan for', walletAddress.toBase58());
    console.log('Scanner: TOKEN_PROGRAM_ID', TOKEN_PROGRAM_ID.toBase58());

    const [splTokenAccounts, token2022Accounts] = await Promise.all([
      this.getTokenAccounts(walletAddress, TOKEN_PROGRAM_ID),
      this.getTokenAccounts(walletAddress, TOKEN_2022_PROGRAM_ID),
    ]);

    console.log('Scanner: SPL accounts found:', splTokenAccounts.length);
    console.log('Scanner: Token2022 accounts found:', token2022Accounts.length);

    const allAccounts = [...splTokenAccounts, ...token2022Accounts];

    const closeableAccounts = allAccounts.filter(acc => acc.isCloseable);
    const nonCloseableAccounts = allAccounts.filter(acc => !acc.isCloseable);

    const totalReclaimableLamports = closeableAccounts.reduce(
      (sum, acc) => sum + acc.rentLamports,
      0
    );

    return {
      totalAccounts: allAccounts.length,
      closeableAccounts,
      nonCloseableAccounts,
      totalReclaimableLamports,
      totalReclaimableSol: totalReclaimableLamports / LAMPORTS_PER_SOL,
    };
  }

  private async getTokenAccounts(
    walletAddress: PublicKey,
    programId: PublicKey
  ): Promise<TokenAccountInfo[]> {
    try {
      console.log('Scanner: Fetching accounts for program', programId.toBase58());
      const response = await this.connection.getParsedTokenAccountsByOwner(
        walletAddress,
        { programId },
        'confirmed'
      );
      console.log('Scanner: Raw response value length:', response.value.length);

      return response.value.map((item) => {
        const parsedData = item.account.data as ParsedAccountData;
        const info = parsedData.parsed.info;
        const tokenAmount = info.tokenAmount;

        const amount = BigInt(tokenAmount.amount);
        const isCloseable = amount === BigInt(0);

        return {
          pubkey: item.pubkey,
          mint: new PublicKey(info.mint),
          owner: new PublicKey(info.owner),
          amount,
          decimals: tokenAmount.decimals,
          rentLamports: item.account.lamports,
          isCloseable,
          programId: programId,
        };
      });
    } catch (error) {
      console.error(`Error fetching token accounts for program ${programId.toBase58()}:`, error);
      return [];
    }
  }

  async getAccountRent(pubkey: PublicKey): Promise<number> {
    const accountInfo = await this.connection.getAccountInfo(pubkey);
    return accountInfo?.lamports ?? 0;
  }
}
