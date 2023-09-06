/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExecuteTransactionRequestType,
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui.js/client";
import { toB64 } from "@mysten/sui.js/utils";
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
   * @param wrapBcs If true, wrap the message bytes in a BCS struct before signing.
   * @returns Base64 encoded serialized signature.
   */
  signPersonalMessage(
    walletId: string,
    sessionToken: string,
    message: string,
    wrapBcs = true
  ): Promise<string> {
    return this.request(
      "shinami_wal_signPersonalMessage",
      [walletId, sessionToken, message, wrapBcs],
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
    gasBudget: number | string,
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
 * A secret session with Shinami key service.
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
          if (details && details.details.includes("Bad session token")) {
            return await run(await this.refreshToken());
          }
        }
        throw e;
      }
    }
  }
}

/**
 * A signer based on Shinami's invisible wallet.
 *
 * It transparently manages session token refreshes.
 */
export class ShinamiWalletSigner {
  readonly walletId: string;
  readonly walletClient: WalletClient;
  private readonly session: KeySession;

  private address?: string;

  constructor(
    walletId: string,
    walletClient: WalletClient,
    session: KeySession
  );
  constructor(
    walletId: string,
    walletClient: WalletClient,
    secret: string,
    keyClient: KeyClient
  );
  constructor(
    walletId: string,
    walletClient: WalletClient,
    secretOrSession: string | KeySession,
    keyClient?: KeyClient
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
      return await this.session.withToken((token) =>
        this.walletClient.createWallet(this.walletId, token)
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
    return this.session.withToken((token) =>
      this.walletClient.signTransactionBlock(this.walletId, token, _txBytes)
    );
  }

  /**
   * Signs a personal message with this wallet.
   * @param message Personal message bytes. If `string`, assumed to be Base64 encoded.
   * @param wrapBcs If true, wrap the message bytes in a BCS struct before signing.
   * @returns Base64 encoded serialized signature.
   */
  signPersonalMessage(
    message: string | Uint8Array,
    wrapBcs = true
  ): Promise<string> {
    const _message = message instanceof Uint8Array ? toB64(message) : message;
    return this.session.withToken((token) =>
      this.walletClient.signPersonalMessage(
        this.walletId,
        token,
        _message,
        wrapBcs
      )
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
    gasBudget: number | string,
    options?: SuiTransactionBlockResponseOptions,
    requestType?: ExecuteTransactionRequestType
  ): Promise<SuiTransactionBlockResponse> {
    const _txBytes = txBytes instanceof Uint8Array ? toB64(txBytes) : txBytes;
    return this.session.withToken((token) =>
      this.walletClient.executeGaslessTransactionBlock(
        this.walletId,
        token,
        _txBytes,
        gasBudget,
        options,
        requestType
      )
    );
  }
}
