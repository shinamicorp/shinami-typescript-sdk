/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { GrpcTypes } from "@mysten/sui/grpc";
import { toBase64 } from "@mysten/sui/utils";
import { JSONRPCError } from "@open-rpc/client-js";
import { JsonValue } from "@protobuf-ts/runtime";
import { Infer, object, string } from "superstruct";
import { ShinamiRpcClient, errorDetails, trimTrailingParams } from "../rpc.js";
import { GaslessTransaction } from "./gas.js";
import { KeyRpcUrls, WalletRpcUrls } from "./endpoints.js";
import { inferRegionalValueFromAccessKey } from "../region.js";

/**
 * Shinami Key RPC client.
 */
export class KeyClient extends ShinamiRpcClient {
  /**
   * @param accessKey Wallet access key.
   * @param url Optional URL override.
   */
  constructor(
    accessKey: string,
    url: string = inferRegionalValueFromAccessKey(
      accessKey,
      KeyRpcUrls,
      (keyRpcUrls) => keyRpcUrls.us1,
    ),
  ) {
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
  constructor(
    accessKey: string,
    url: string = inferRegionalValueFromAccessKey(
      accessKey,
      WalletRpcUrls,
      (walletRpcUrls) => walletRpcUrls.us1,
    ),
  ) {
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
      string(),
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
   * Signs a transaction with the specified wallet.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param txBytes Transaction bytes. If `string`, assumed to be Base64 encoded.
   * @returns Signing result.
   */
  signTransaction(
    walletId: string,
    sessionToken: string,
    txBytes: string | Uint8Array,
  ): Promise<SignTransactionResult> {
    if (txBytes instanceof Uint8Array) txBytes = toBase64(txBytes);
    return this.request(
      "shinami_wal_signTransactionBlock",
      [walletId, sessionToken, txBytes],
      SignTransactionResult,
    );
  }

  /**
   * Signs a personal message with the specified wallet.
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param message Personal message bytes. If `string`, assumed to be Base64 encoded.
   * @param wrapBcs If true, wrap the message bytes in a BCS struct before signing.
   * @returns Base64 encoded serialized signature.
   */
  signPersonalMessage(
    walletId: string,
    sessionToken: string,
    message: string | Uint8Array,
    wrapBcs = true,
  ): Promise<string> {
    if (message instanceof Uint8Array) message = toBase64(message);
    return this.request(
      "shinami_wal_signPersonalMessage",
      [walletId, sessionToken, message, wrapBcs],
      string(),
    );
  }

  /**
   * Sponsors, signs, and executes a gasless transaction.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   *
   * Note this call itself is still JSON-RPC like every other method on this client. The Shinami
   * backend now sponsors and executes this transaction against a Sui node over gRPC, and forwards
   * that gRPC response back to you. The raw wire transport for this call is JSON, but the result
   * is converted back into Sui's native gRPC `ExecuteTransactionResponse` representation before
   * being returned.
   *
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param tx Gasless transaction.
   * @param readMask Field mask paths specifying which fields to read in the response. Defaults to
   *    `effects.status,checkpoint` if omitted.
   * @returns Transaction execution response, matching Sui's native gRPC
   *    `ExecuteTransactionResponse`.
   */
  executeGaslessTransaction(
    walletId: string,
    sessionToken: string,
    tx: Omit<GaslessTransaction, "sender">,
    readMask?: string[],
  ): Promise<GrpcTypes.ExecuteTransactionResponse> {
    return this.request(
      "shinami_wal_executeGaslessTransactionBlock",
      trimTrailingParams([
        walletId,
        sessionToken,
        tx.txKind,
        tx.gasBudget,
        tx.gasPrice,
        readMask,
      ]),
    ).then((raw) =>
      GrpcTypes.ExecuteTransactionResponse.fromJson(raw as JsonValue),
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
        this.walletClient.createWallet(this.walletId, token),
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
   * @param txBytes Transaction bytes. If `string`, assumed to be Base64 encoded.
   * @returns Signing result.
   */
  signTransaction(
    txBytes: string | Uint8Array,
  ): Promise<SignTransactionResult> {
    return this.session.withToken((token) =>
      this.walletClient.signTransaction(this.walletId, token, txBytes),
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
    wrapBcs = true,
  ): Promise<string> {
    return this.session.withToken((token) =>
      this.walletClient.signPersonalMessage(
        this.walletId,
        token,
        message,
        wrapBcs,
      ),
    );
  }

  /**
   * Sponsors, signs, and executes a gasless transaction.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   *
   * See `WalletClient.executeGaslessTransaction` for details.
   *
   * @param tx Gasless transaction.
   * @param readMask Field mask paths specifying which fields to read in the response. Defaults to
   *    `effects.status,checkpoint` if omitted.
   * @returns Transaction execution response, shaped like Sui's native gRPC
   *    `ExecuteTransactionResponse`.
   */
  executeGaslessTransaction(
    tx: Omit<GaslessTransaction, "sender">,
    readMask?: string[],
  ): Promise<GrpcTypes.ExecuteTransactionResponse> {
    return this.session.withToken((token) =>
      this.walletClient.executeGaslessTransaction(
        this.walletId,
        token,
        tx,
        readMask,
      ),
    );
  }
}
