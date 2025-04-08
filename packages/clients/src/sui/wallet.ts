/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExecuteTransactionRequestType,
  SuiTransactionBlockResponse,
  SuiTransactionBlockResponseOptions,
} from "@mysten/sui/client";
import { toB64 } from "@mysten/sui/utils";
import { JSONRPCError } from "@open-rpc/client-js";
import { Infer, nullable, object, string } from "superstruct";
import { ShinamiRpcClient, errorDetails, trimTrailingParams } from "../rpc.js";
import { GaslessTransaction } from "./gas.js";
import { KeyRpcUrl, WalletRpcUrl } from "./endpoints.js";
import { Region } from "../region.js";

/**
 * Shinami Key RPC client.
 */
export class KeyClient extends ShinamiRpcClient {
  /**
   * @param accessKey Wallet access key.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = KeyRpcUrl[Region.US1]) {
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
  constructor(accessKey: string, url: string = WalletRpcUrl[Region.US1]) {
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
    if (txBytes instanceof Uint8Array) txBytes = toB64(txBytes);
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
    if (message instanceof Uint8Array) message = toB64(message);
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
   * - Node Service
   *
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param tx Gasless transaction.
   * @param options Transaction execution response options.
   * @param requestType Transaction execution request type.
   * @returns Transaction execution response.
   */
  executeGaslessTransaction(
    walletId: string,
    sessionToken: string,
    tx: Omit<GaslessTransaction, "sender">,
    options?: SuiTransactionBlockResponseOptions,
    requestType?: ExecuteTransactionRequestType,
  ): Promise<SuiTransactionBlockResponse> {
    return this.request(
      "shinami_wal_executeGaslessTransactionBlock",
      trimTrailingParams([
        walletId,
        sessionToken,
        tx.txKind,
        tx.gasBudget,
        options,
        requestType,
        tx.gasPrice,
      ]),
      /* Not validating result because it's from Sui node */
    );
  }

  /**
   * [Beneficiary Graph API]
   * Designates a beneficiary account for this wallet in the specified beneficiary graph instance.
   * Calling this method multiple times will override the previous designations.
   *
   * Apps participating in Bullshark Quests can use this method to link up Shinami invisible wallets
   * with their users' self-custody wallets.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   * - Node Service
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param beneficiaryGraphId Id of the beneficiary graph instance.
   * @param beneficiaryAddress Beneficiary address.
   * @returns Transaction digest for this operation.
   */
  setBeneficiary(
    walletId: string,
    sessionToken: string,
    beneficiaryGraphId: string,
    beneficiaryAddress: string,
  ): Promise<string> {
    return this.request(
      "shinami_walx_setBeneficiary",
      [walletId, sessionToken, beneficiaryGraphId, beneficiaryAddress],
      string(),
    );
  }

  /**
   * [Beneficiary Graph API]
   * Clears any beneficiary designation for this wallet in the specified beneficiary graph instance.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   * - Node Service
   * @param walletId Wallet id.
   * @param sessionToken Session token, obtained by `KeyClient.createSession`.
   * @param beneficiaryGraphId Id of the beneficiary graph instance.
   * @returns Transaction digest for this operation.
   */
  unsetBeneficiary(
    walletId: string,
    sessionToken: string,
    beneficiaryGraphId: string,
  ): Promise<string> {
    return this.request(
      "shinami_walx_unsetBeneficiary",
      [walletId, sessionToken, beneficiaryGraphId],
      string(),
    );
  }

  /**
   * [Beneficiary Graph API]
   * Gets the beneficiary designation for this wallet in the specified beneficiary graph instance.
   * This is a convenience method on top of suix_getDynamicFieldObject.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Node Service
   * @param walletId Wallet id.
   * @param beneficiaryGraphId Id of the beneficiary graph instance.
   * @returns Beneficiary address, or null if no beneficiary is designated.
   */
  getBeneficiary(
    walletId: string,
    beneficiaryGraphId: string,
  ): Promise<string | null> {
    return this.request(
      "shinami_walx_getBeneficiary",
      [walletId, beneficiaryGraphId],
      nullable(string()),
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
   * - Node Service
   *
   * @param tx Gasless transaction.
   * @param options Transaction execution response options.
   * @param requestType Transaction execution request type.
   * @returns Transaction execution response.
   */
  executeGaslessTransaction(
    tx: Omit<GaslessTransaction, "sender">,
    options?: SuiTransactionBlockResponseOptions,
    requestType?: ExecuteTransactionRequestType,
  ): Promise<SuiTransactionBlockResponse> {
    return this.session.withToken((token) =>
      this.walletClient.executeGaslessTransaction(
        this.walletId,
        token,
        tx,
        options,
        requestType,
      ),
    );
  }

  /**
   * [Beneficiary Graph API]
   * Designates a beneficiary account for this wallet in the specified beneficiary graph instance.
   * Calling this method multiple times will override the previous designations.
   *
   * Apps participating in Bullshark Quests can use this method to link up Shinami invisible wallets
   * with their users' self-custody wallets.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   * - Node Service
   * @param beneficiaryGraphId Id of the beneficiary graph instance.
   * @param beneficiaryAddress Beneficiary address.
   * @returns Transaction digest for this operation.
   */
  setBeneficiary(
    beneficiaryGraphId: string,
    beneficiaryAddress: string,
  ): Promise<string> {
    return this.session.withToken((token) =>
      this.walletClient.setBeneficiary(
        this.walletId,
        token,
        beneficiaryGraphId,
        beneficiaryAddress,
      ),
    );
  }

  /**
   * [Beneficiary Graph API]
   * Clears any beneficiary designation for this wallet in the specified beneficiary graph instance.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Gas Station
   * - Node Service
   * @param beneficiaryGraphId Id of the beneficiary graph instance.
   * @returns Transaction digest for this operation.
   */
  unsetBeneficiary(beneficiaryGraphId: string): Promise<string> {
    return this.session.withToken((token) =>
      this.walletClient.unsetBeneficiary(
        this.walletId,
        token,
        beneficiaryGraphId,
      ),
    );
  }

  /**
   * [Beneficiary Graph API]
   * Gets the beneficiary designation for this wallet in the specified beneficiary graph instance.
   * This is a convenience method on top of suix_getDynamicFieldObject.
   *
   * To call this method, your access key must be authorized for all of these Shinami services:
   * - Wallet Service
   * - Node Service
   * @param beneficiaryGraphId Id of the beneficiary graph instance.
   * @returns Beneficiary address, or null if no beneficiary is designated.
   */
  getBeneficiary(beneficiaryGraphId: string): Promise<string | null> {
    return this.walletClient.getBeneficiary(this.walletId, beneficiaryGraphId);
  }
}

/**
 * Offical beneficiary graph id recognized by the Bullshark Quests for point tracking.
 * Must be used with a Mainnet access key.
 */
export const BULLSHARK_QUEST_BENEFICIARY_GRAPH_ID_MAINNET =
  "0x39fabecb3e74036e6140a938fd1cb194a1affd086004e93c4a76af59d64a2c76";

/**
 * Example beneficiary graph id published on Testnet.
 * Must be used with a Testnet access key.
 */
export const EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET =
  "0x1987692739e70cea40e5f2596eee2ebe00bde830f72bb76a7187a0d6d4cea278";
