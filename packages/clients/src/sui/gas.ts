/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { toB64 } from "@mysten/sui/utils";
import { Infer, enums, number, object, optional, string } from "superstruct";
import { ShinamiRpcClient, trimTrailingParams } from "../rpc.js";
import { throwExpression } from "../utils.js";
import { Region } from "../region.js";
import { GasStationRpcUrl } from "./endpoints.js";

/**
 * A gasless transaction to be sponsored.
 */
export interface GaslessTransaction {
  /**
   * Base64 encoded `TransactionKind`.
   */
  txKind: string;

  /**
   * Optional sender address. Required when submitting for sponsorship.
   */
  sender?: string;

  /**
   * Optional gas budget. If omitted, it will be estimated from the transaction.
   */
  gasBudget?: number | string;

  /**
   * Optional gas price. If omitted, the reference price will be used.
   */
  gasPrice?: number | string;
}

/**
 * A fully sponsored transaction block.
 */
export const SponsoredTransaction = object({
  /**
   * Base64 encoded transaction bytes, including sponsor gas data.
   */
  txBytes: string(),
  /**
   * Transaction digest. Can be used to identify this sponsored transaction.
   */
  txDigest: string(),
  /**
   * Gas owner's signature.
   */
  signature: string(),
  /**
   * Cost breakdown for the sponsor.
   */
  sponsorCost: optional(
    object({
      computationCost: string(),
      storageCost: string(),
      storageRebate: string(),
    }),
  ),
  /**
   * Expiration time of this sponsored transaction, in Unix epoch seconds.
   */
  expireAtTime: optional(number()),
  /**
   * The last Sui epoch this sponsored transaction is valid for.
   */
  expireAfterEpoch: optional(string()),
});
export type SponsoredTransaction = Infer<typeof SponsoredTransaction>;

/**
 * The status of a sponsored transaction block.
 */
export const SponsoredTransactionStatus = enums([
  "IN_FLIGHT",
  "COMPLETE",
  "INVALID",
]);
export type SponsoredTransactionStatus = Infer<
  typeof SponsoredTransactionStatus
>;

/**
 * The fund information
 */
export const Fund = object({
  network: string(),
  name: string(),
  balance: number(),
  inFlight: number(),
  depositAddress: optional(string()),
});
export type Fund = Infer<typeof Fund>;

/**
 * Gas station RPC client.
 */
export class GasStationClient extends ShinamiRpcClient {
  /**
   * @param accessKey Gas access key. Note that the access key also determines which network your
   *    transactions are targeting.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = GasStationRpcUrl[Region.US1]) {
    super(accessKey, url);
  }

  /**
   * Requests sponsorship for a transaction.
   * @param tx Gasless transaction.
   * @returns A fully sponsored transaction block.
   */
  async sponsorTransaction(
    tx: GaslessTransaction,
  ): Promise<SponsoredTransaction> {
    return this.request(
      "gas_sponsorTransactionBlock",
      trimTrailingParams([
        tx.txKind,
        tx.sender ?? throwExpression(new Error("Missing sender")),
        tx.gasBudget,
        tx.gasPrice,
      ]),
      SponsoredTransaction,
    );
  }

  /**
   * Queries the status of a sponsored transaction block.
   * @param txDigest Sponsored transaction digetst.
   * @returns Sponsored transaction status.
   */
  getSponsoredTransactionStatus(
    txDigest: string,
  ): Promise<SponsoredTransactionStatus> {
    return this.request(
      "gas_getSponsoredTransactionBlockStatus",
      [txDigest],
      SponsoredTransactionStatus,
    );
  }

  /**
   * Queries the fund associated with the access key.
   * @returns The fund information.
   */
  getFund(): Promise<Fund> {
    return this.request("gas_getFund", [], Fund);
  }
}

/**
 * Builds a gasless transaction.
 * @param txOrBuild Either a `Transaction` object pre-populated with the target transaction data, or
 *    a builder function to populate it.
 * @param options Options
 *    - sender - Optional sender address. Can also be set in the transaction data.
 *    - gasBudget - Optional gas budget. Can also be set in the transaction data.
 *    - gasPrice - Optional gas price. Can also be set in the transaction data.
 *    - sui - `SuiClient`. Required if the transaction uses non fully resolved inputs.
 * @returns A gasless transaction to be sponsored.
 */
export async function buildGaslessTransaction(
  txOrBuild: Transaction | ((tx: Transaction) => void | Promise<void>),
  options?: {
    sender?: string;
    gasBudget?: number | string;
    gasPrice?: number | string;
    sui?: SuiClient;
  },
): Promise<GaslessTransaction> {
  let tx: Transaction;
  if (typeof txOrBuild === "function") {
    tx = new Transaction();
    await txOrBuild(tx);
  } else {
    tx = txOrBuild;
  }
  const txData = tx.getData();

  return {
    txKind: toB64(
      await tx.build({ client: options?.sui, onlyTransactionKind: true }),
    ),
    sender: options?.sender ?? txData.sender ?? undefined,
    gasBudget: options?.gasBudget ?? txData.gasData.budget ?? undefined,
    gasPrice: options?.gasPrice ?? txData.gasData.price ?? undefined,
  };
}
