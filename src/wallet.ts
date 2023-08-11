/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExecuteTransactionRequestType,
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
  toB64,
} from "@mysten/sui.js";
import { JSONRPCError } from "@open-rpc/client-js";
import { Infer, object, string } from "superstruct";
import { ShinamiRpcClient, errorDetails, trimTrailingParams } from "./rpc.js";

const KEY_RPC_URL = "https://api.shinami.com/key/v1";
const WALLET_RPC_URL = "https://api.shinami.com/wallet/v1";

/**
 * Shinami Key RPC client.
 */
export class KeyClient extends ShinamiRpcClient {
  /**
   * @param accessKey Wallet access key.
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
    return this.request("shinami_key_createSession", [secret], string());
  }
}

/**
 * Transaction signing result.
 */
export const SignTransactionResult = object({
  signature: string(),
  txDigest: string(),
});
export type SignTransactionResult = Infer<typeof SignTransactionResult>;

/**
 * Shinami Wallet RPC client.
 */
export class WalletClient extends ShinamiRpcClient {
  /**
   * @param accessKey Wallet access key.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = WALLET_RPC_URL) {
    super(accessKey, url);
  }

  /**
   * Creates a new wallet.
   * @param walletId Wallet id. Must not exist, or an error will be returned.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @returns Sui address of the created wallet.
   */
  createWallet(walletId: string, sessionToken: string): Promise<string> {
    return this.request(
      "shinami_wal_createWallet",
      [walletId, sessionToken],
      string()
    );
  }

  /**
   * Retrieves the wallet address.
   * @param walletId Wallet id.
   * @returns Wallet address.
   */
  getWallet(walletId: string): Promise<string> {
    return this.request("shinami_wal_getWallet", [walletId], string());
  }

  /**
   * Signs a transaction block with the specified wallet.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param txBytes Base64 encoded transaction bytes.
   * @returns Signing result.
   */
  signTransactionBlock(
    walletId: string,
    sessionToken: string,
    txBytes: string
  ): Promise<SignTransactionResult> {
    return this.request(
      "shinami_wal_signTransactionBlock",
      [walletId, sessionToken, txBytes],
      SignTransactionResult
    );
  }

  /**
   * Signs a personal message with the specified wallet.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param message Base64 encoded personal message.
   * @returns Base64 encoded serialized signature.
   */
  signPersonalMessage(
    walletId: string,
    sessionToken: string,
    message: string
  ): Promise<string> {
    return this.request(
      "shinami_wal_signPersonalMessage",
      [walletId, sessionToken, message],
      string()
    );
  }

  /**
   * Sponsors, signs, and executes a gasless transaction block.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   * - Node Service
   *
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param txBytes Base64 encoded gasless transaction bytes. These are the BCS bytes of a
   *    `TransactionKind` as opposed to `TransactionData`.
   * @param gasBudget Gas budget.
   * @param options Transaction execution response options.
   * @param requestType Transaction execution request type.
   * @returns Transaction execution response.
   */
  executeGaslessTransactionBlock(
    walletId: string,
    sessionToken: string,
    txBytes: string,
    gasBudget: number,
    options?: SuiTransactionBlockResponseOptions,
    requestType?: ExecuteTransactionRequestType
  ): Promise<SuiTransactionBlockResponse> {
    return this.request(
      "shinami_wal_executeGaslessTransactionBlock",
      trimTrailingParams([
        walletId,
        sessionToken,
        txBytes,
        gasBudget,
        options,
        requestType,
      ])
      /* Not validating result for now */
    );
  }
}

/**
 * A signer based on Shinami's invisible wallet.
 *
 * It transparently manages session token refreshes.
 */
export class ShinamiWalletSigner {
  readonly walletId: string;
  private readonly secret: string;

  readonly keyClient: KeyClient;
  readonly walletClient: WalletClient;

  private address?: string;
  private session?: string;

  constructor(
    walletId: string,
    secret: string,
    keyClient: KeyClient,
    walletClient: WalletClient
  ) {
    this.walletId = walletId;
    this.secret = secret;
    this.keyClient = keyClient;
    this.walletClient = walletClient;
  }

  /**
   * Refreshes the session token.
   * @returns The refreshed session token.
   */
  async refreshSession(): Promise<string> {
    this.session = await this.keyClient.createSession(this.secret);
    return this.session;
  }

  /**
   * Runs a code block with the session token. Handles session refreshes upon expiration.
   * @param run The code to run.
   * @returns Result of `run`.
   */
  async withSession<T>(run: (session: string) => Promise<T>): Promise<T> {
    if (!this.session) {
      return await run(await this.refreshSession());
    } else {
      try {
        return await run(this.session);
      } catch (e: unknown) {
        if (e instanceof JSONRPCError && e.code === -32602) {
          const details = errorDetails(e);
          if (details && details.details.includes("Bad session token")) {
            return await run(await this.refreshSession());
          }
        }
        throw e;
      }
    }
  }

  /**
   * Retrieves the wallet address.
   * @param autoCreate Whether to automatically create the wallet if it doesn't exist yet.
   *    If `false`, and the wallet doesn't exist, an error will be thrown.
   * @returns Wallet address.
   */
  async getAddress(autoCreate = false): Promise<string> {
    if (!this.address) this.address = await this._getAddress(autoCreate);
    return this.address;
  }

  private async _getAddress(autoCreate: boolean): Promise<string> {
    try {
      return await this.walletClient.getWallet(this.walletId);
    } catch (e: unknown) {
      if (autoCreate && e instanceof JSONRPCError && e.code === -32602) {
        const address = await this.tryCreate();
        if (address) return address;
        return await this.walletClient.getWallet(this.walletId);
      }
      throw e;
    }
  }

  /**
   * Tries to create this wallet if not exists.
   * @returns The wallet address if it was just created. `undefined` if pre-existing, in which case
   *    you can call `getAddress` to retrive the said info.
   */
  async tryCreate(): Promise<string | undefined> {
    try {
      return await this.withSession((session) =>
        this.walletClient.createWallet(this.walletId, session)
      );
    } catch (e: unknown) {
      if (e instanceof JSONRPCError && e.code === -32602) {
        const details = errorDetails(e);
        if (details && details.details.includes("Wallet ID already exists"))
          return;
      }
      throw e;
    }
  }

  /**
   * Signs a transaction block with this wallet.
   * @param txBytes Serialized transaction block. If `string`, assumed to be Base64 encoded.
   * @returns Signing result.
   */
  signTransactionBlock(
    txBytes: string | Uint8Array
  ): Promise<SignTransactionResult> {
    const _txBytes = txBytes instanceof Uint8Array ? toB64(txBytes) : txBytes;
    return this.withSession((session) =>
      this.walletClient.signTransactionBlock(this.walletId, session, _txBytes)
    );
  }

  /**
   * Signs a personal message with this wallet.
   * @param message Personal message bytes. If `string`, assumed to be Base64 encoded.
   * @returns Base64 encoded serialized signature.
   */
  signPersonalMessage(message: string | Uint8Array): Promise<string> {
    const _message = message instanceof Uint8Array ? toB64(message) : message;
    return this.withSession((session) =>
      this.walletClient.signPersonalMessage(this.walletId, session, _message)
    );
  }

  /**
   * Sponsors, signs, and executes a gasless transaction block.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   * - Node Service
   *
   * @param txBytes BCS serialized bytes of a `TransactionKind` as opposed to `TransactionData`.
   *    If `string`, assumed to be Base64 encoded.
   * @param gasBudget Gas budget.
   * @param options Transaction execution response options.
   * @param requestType Transaction execution request type.
   * @returns Transaction execution response.
   */
  executeGaslessTransactionBlock(
    txBytes: string | Uint8Array,
    gasBudget: number,
    options?: SuiTransactionBlockResponseOptions,
    requestType?: ExecuteTransactionRequestType
  ): Promise<SuiTransactionBlockResponse> {
    const _txBytes = txBytes instanceof Uint8Array ? toB64(txBytes) : txBytes;
    return this.withSession((session) =>
      this.walletClient.executeGaslessTransactionBlock(
        this.walletId,
        session,
        _txBytes,
        gasBudget,
        options,
        requestType
      )
    );
  }
}
