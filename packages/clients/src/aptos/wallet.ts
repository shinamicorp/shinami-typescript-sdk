/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccountAddress,
  Deserializer,
  SimpleTransaction,
  MultiAgentTransaction,
  AnyRawTransaction,
  AccountAuthenticator,
  PendingTransactionResponse,
} from "@aptos-labs/ts-sdk";
import { Infer, array, integer, object, string, unknown } from "superstruct";
import { ShinamiRpcClient, errorDetails, trimTrailingParams } from "../rpc.js";
import { JSONRPCError } from "@open-rpc/client-js";

const KEY_RPC_URL = "https://api.shinami.com/aptos/key/v1";
const WALLET_RPC_URL = "https://api.shinami.com/aptos/wallet/v1";

/**
 * Shinami Key RPC client for Aptos.
 */
export class KeyClient extends ShinamiRpcClient {
  /**
   * @param accessKey Aptos Wallet access key.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = KEY_RPC_URL) {
    super(accessKey, url);
  }

  /**
   * Creates a session with the provided wallet secret.
   * @param secret Wallet secret. For later operations to succeed, the secret must match what the
   *    wallet was created with.
   * @returns A session token used to perform sensitive wallet operations with, valid for 10 mins.
   */
  createSession(secret: string): Promise<string> {
    return this.request("key_createSession", [secret], string());
  }
}

/**
 * Results for wallet operation methods.
 */
const WalletResult = object({
  accountAddress: string(),
});
type WalletResult = Infer<typeof WalletResult>;

/**
 * Result of signing a transaction
 */
const SignTransactionResult = object({
  signature: array(integer()),
});
type SignTransactionResult = Infer<typeof SignTransactionResult>;

/**
 * Gasless transaction execution result
 */
const ExecuteGaslessTransactionResult = object({
  pendingTransaction: unknown(),
});
type ExecuteGaslessTransactionResult = Infer<
  typeof ExecuteGaslessTransactionResult
>;

/**
 * Shinami Wallet RPC client for Aptos.
 */
export class WalletClient extends ShinamiRpcClient {
  /**
   * @param accessKey Aptos Wallet access key.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = WALLET_RPC_URL) {
    super(accessKey, url);
  }

  /**
   * Creates a new wallet that is not initialized on chain.
   * @param walletId Wallet id. Must not have been previously used, or an error will be returned.
   * @param sessionToken Session token. Obtained by `KeyClient.createSession`.
   * @returns Aptos address of the created wallet.
   */
  async createWallet(
    walletId: string,
    sessionToken: string,
  ): Promise<AccountAddress> {
    const { accountAddress } = await this.request(
      "wal_createWallet",
      [walletId, sessionToken],
      WalletResult,
    );
    return AccountAddress.from(accountAddress);
  }

  /**
   * Initializes a wallet that was created with `createWallet` onto the Aptos chain. Network is dictated by the access key used.
   * @param walletId Wallet id used previously in `createWallet`
   * @param sessionToken Session token. Obtained by `KeyClient.createSession`.
   * @returns Aptos address of the created wallet that is now initialized on chain.
   */
  async initializeWalletOnChain(
    walletId: string,
    sessionToken: string,
  ): Promise<AccountAddress> {
    const { accountAddress } = await this.request(
      "wal_initializeWalletOnChain",
      [walletId, sessionToken],
      WalletResult,
    );
    return AccountAddress.from(accountAddress);
  }

  /**
   * Creates a new wallet and initializes it on the Aptos chain. Network is dictated by the access key used.
   * @param walletId Wallet id. Must not have been previously used, or an error will be returned.
   * @param sessionToken Session token. Obtained by `KeyClient.createSession`.
   * @returns Aptos address of the created wallet that is also initialized on chain.
   */
  async createWalletOnChain(
    walletId: string,
    sessionToken: string,
  ): Promise<AccountAddress> {
    const { accountAddress } = await this.request(
      "wal_createWalletOnChain",
      [walletId, sessionToken],
      WalletResult,
    );
    return AccountAddress.from(accountAddress);
  }

  /**
   * Retrieves a wallet address.
   * @param walletId Wallet id. Does not have to be an initialized address.
   * @returns Wallet address
   */
  async getWallet(walletId: string): Promise<AccountAddress> {
    const { accountAddress } = await this.request(
      "wal_getWallet",
      [walletId],
      WalletResult,
    );
    return AccountAddress.from(accountAddress);
  }

  /**
   * Signs a transaction with the specified wallet.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param transaction Transaction. Can be SimpleTransaction or MultiAgentTransaction
   * @returns Signing Result
   */
  async signTransaction(
    walletId: string,
    sessionToken: string,
    transaction: AnyRawTransaction,
  ): Promise<AccountAuthenticator> {
    const { signature } = await this.request(
      "wal_signTransaction",
      trimTrailingParams([
        walletId,
        sessionToken,
        transaction.rawTransaction.bcsToHex().toString(),
        transaction.secondarySignerAddresses?.map((x) => x.toString()),
        transaction.feePayerAddress?.toString(),
      ]),
      SignTransactionResult,
    );
    return AccountAuthenticator.deserialize(
      new Deserializer(new Uint8Array(signature)),
    );
  }

  /**
   * Sponsors, signs, and executes a SimpleTransaction gaslessly with the specified wallet as the sender.
   * To call this method, your access key must be authorized for both the Aptos Wallet Service and Aptos Gas Station.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param transaction Transaction of type SimpleTransaction.
   * @returns The submitted transaction in mempool
   */
  async executeGaslessTransaction(
    walletId: string,
    sessionToken: string,
    transaction: SimpleTransaction,
  ): Promise<PendingTransactionResponse>;

  /**
   * Executes a MultiAgentTransaction gaslessly with the specified wallet as the sender.
   * To call this method, your access key must be authorized for both the Aptos Wallet Service and Aptos Gas Station.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param transaction Transaction of type MultiAgentTransaction.
   * @param secondarySignatures Other signers for this MultiAgentTransaction.
   * @returns The submitted transaction in mempool
   */
  async executeGaslessTransaction(
    walletId: string,
    sessionToken: string,
    transaction: MultiAgentTransaction,
    secondarySignatures: AccountAuthenticator[],
  ): Promise<PendingTransactionResponse>;

  async executeGaslessTransaction(
    walletId: string,
    sessionToken: string,
    transaction: AnyRawTransaction,
    secondarySignatures?: AccountAuthenticator[],
  ): Promise<PendingTransactionResponse> {
    const secondarySigners = [];
    if (transaction.secondarySignerAddresses) {
      if (
        secondarySignatures?.length !==
        transaction.secondarySignerAddresses.length
      )
        throw new Error("Unexpected number of secondary signatures");

      secondarySigners.push(
        ...transaction.secondarySignerAddresses.map((address, i) => ({
          address: address.toString(),
          signature: secondarySignatures[i].bcsToHex().toString(),
        })),
      );
    }
    const { pendingTransaction } = await this.request(
      "wal_executeGaslessTransaction",
      [
        walletId,
        sessionToken,
        transaction.rawTransaction.bcsToHex().toString(),
        secondarySigners,
      ],
      ExecuteGaslessTransactionResult,
    );
    return pendingTransaction as PendingTransactionResponse;
  }
}

/**
 * A secret session with Shinami Aptos key service.
 */
export class KeySession {
  private readonly secret: string;
  readonly keyClient: KeyClient;

  private token?: string;

  constructor(secret: string, keyClient: KeyClient) {
    this.secret = secret;
    this.keyClient = keyClient;
  }

  /**
   * Refreshes the session token.
   * @returns The refreshed session token.
   */
  async refreshToken(): Promise<string> {
    this.token = await this.keyClient.createSession(this.secret);
    return this.token;
  }

  /**
   * Runs a code block with the session token. Handles token refreshes upon expiration.
   * @param run The code to run.
   * @returns Result of `run`.
   */
  async withToken<T>(run: (token: string) => Promise<T>): Promise<T> {
    if (!this.token) {
      return await run(await this.refreshToken());
    } else {
      try {
        return await run(this.token);
      } catch (e: unknown) {
        if (e instanceof JSONRPCError && e.code === -32602) {
          const details = errorDetails(e);
          if (details?.details?.includes("Bad session token")) {
            return await run(await this.refreshToken());
          }
        }
        throw e;
      }
    }
  }
}

/**
 * A signer based on Shinami's invisible wallet for Aptos.
 *
 * It transparently manages session token refreshes.
 */
export class ShinamiWalletSigner {
  readonly walletId: string;
  readonly walletClient: WalletClient;
  private readonly session: KeySession;

  private address?: AccountAddress;

  constructor(
    walletId: string,
    walletClient: WalletClient,
    session: KeySession,
  );
  constructor(
    walletId: string,
    walletClient: WalletClient,
    secret: string,
    keyClient: KeyClient,
  );
  constructor(
    walletId: string,
    walletClient: WalletClient,
    secretOrSession: string | KeySession,
    keyClient?: KeyClient,
  ) {
    this.walletId = walletId;
    this.walletClient = walletClient;

    if (secretOrSession instanceof KeySession) {
      this.session = secretOrSession;
    } else {
      if (!keyClient) throw new Error("Must provide keyClient with secret");
      this.session = new KeySession(secretOrSession, keyClient);
    }
  }

  /**
   * Retrieves the wallet address.
   * @param autoCreate Whether to automatically create the wallet (off chain) if it doesn't exist yet.
   *    If `false`, and the wallet doesn't exist, an error will be thrown.
   * @param onChain whether to initialize the address on chain after creation. It will use the network
   *    attached to the access key in the sessionToken. Only relevant if autoCreate is set to `true`
   * @returns Wallet address.
   */
  async getAddress(
    autoCreate = false,
    onChain = false,
  ): Promise<AccountAddress> {
    if (!this.address)
      this.address = await this._getAddress(autoCreate, onChain);
    return this.address;
  }

  private async _getAddress(
    autoCreate: boolean,
    onChain: boolean,
  ): Promise<AccountAddress> {
    try {
      return await this.walletClient.getWallet(this.walletId);
    } catch (e: unknown) {
      if (e instanceof JSONRPCError && e.code === -32602 && autoCreate) {
        const address = await this.tryCreate(onChain);
        if (address) return address;
        return await this.walletClient.getWallet(this.walletId);
      }
      throw e;
    }
  }

  /**
   * Tries to create this wallet if it doesn't exist.
   * @param onChain If set, it will try to create the wallet and initialize it on chain as well.
   *    The access key used must be authorized for Aptos gas station. On chain initialization costs
   *    will be drawn from the attached gas station fund.
   * @returns The wallet address if it was just created. `undefined` if pre-existing, in which case
   *  you can call `getAddfress` to retrieve the said info.
   */
  async tryCreate(onChain: boolean): Promise<AccountAddress | undefined> {
    try {
      return await this.session.withToken((token) =>
        onChain
          ? this.walletClient.createWalletOnChain(this.walletId, token)
          : this.walletClient.createWallet(this.walletId, token),
      );
    } catch (e: unknown) {
      if (e instanceof JSONRPCError && e.code === -32602) {
        const details = errorDetails(e);
        if (details?.details?.includes("Wallet ID already exists")) return;
      }
      throw e;
    }
  }

  /**
   * Signs a transaction with this wallet.
   * @param transaction Transaction of type SimpleTransaction or MultiAgentTransaction.
   * @returns Signing result.
   */
  signTransaction(
    transaction: AnyRawTransaction,
  ): Promise<AccountAuthenticator> {
    return this.session.withToken((token) =>
      this.walletClient.signTransaction(this.walletId, token, transaction),
    );
  }

  /**
   * Sponsors, signs, and executes a SimpleTransaction gaslessly with the specified wallet as the sender.
   * To call this method, your access key must be authorized for both the Aptos Wallet Service and Aptos Gas Station.
   * @param transaction Transaction of type SimpleTransaction.
   * @returns The submitted transaction in mempool.
   */
  executeGaslessTransaction(
    transaction: SimpleTransaction,
  ): Promise<PendingTransactionResponse>;

  /**
   * Sponsors, signs, and executes a MultiAgentTransaction gaslessly with the specified wallet as the sender.
   * To call this method, your access key must be authorized for both the Aptos Wallet Service and Aptos Gas Station.
   * @param transaction Transaction of type MultiAgentTransaction.
   * @param secondarySignatures: Other signers for this MultiAgentTransaction.
   * @returns The submitted transaction in mempool.
   */
  executeGaslessTransaction(
    transaction: MultiAgentTransaction,
    secondarySignatures: AccountAuthenticator[],
  ): Promise<PendingTransactionResponse>;

  executeGaslessTransaction(
    transaction: AnyRawTransaction,
    secondarySignatures?: AccountAuthenticator[],
  ): Promise<PendingTransactionResponse> {
    if (secondarySignatures !== undefined) {
      return this.session.withToken((token) =>
        this.walletClient.executeGaslessTransaction(
          this.walletId,
          token,
          transaction as MultiAgentTransaction,
          secondarySignatures,
        ),
      );
    } else {
      return this.session.withToken((token) =>
        this.walletClient.executeGaslessTransaction(
          this.walletId,
          token,
          transaction as SimpleTransaction,
        ),
      );
    }
  }
}
