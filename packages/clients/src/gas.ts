/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { toB64 } from "@mysten/sui.js/utils";
import { Infer, enums, number, object, optional, string } from "superstruct";
import { ShinamiRpcClient } from "./rpc.js";

const GAS_STATION_RPC_URL = "https://api.shinami.com/gas/v1";

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
    })
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
  depositAddress: optional(string())
});
export type Fund = Infer<
  typeof Fund
>;

/**
 * Gas station RPC client.
 */
export class GasStationClient extends ShinamiRpcClient {
  /**
   * @param accessKey Gas access key. Note that the access key also determines which network your
   *    transactions are targeting.
   * @param url Optional URL override.
   */
  constructor(accessKey: string, url: string = GAS_STATION_RPC_URL) {
    super(accessKey, url);
  }

  /**
   * Requests sponsorship for a gasless transaction block.
   * @param txBytes Base64 encoded gasless transaction bytes. These are the BCS bytes of a
   *    `TransactionKind` as opposed to `TransactionData`.
   * @param sender Transaction sender address.
   * @param gasBudget Gas budget. If omitted, it will be estimated from the transaction.
   * @returns A fully sponsored transaction block.
   */
  sponsorTransactionBlock(
    txBytes: string,
    sender: string,
    gasBudget?: number | string
  ): Promise<SponsoredTransaction> {
    return this.request(
      "gas_sponsorTransactionBlock",
      [txBytes, sender, gasBudget],
      SponsoredTransaction
    );
  }

  /**
   * Queries the status of a sponsored transaction block.
   * @param txDigest Sponsored transaction digetst.
   * @returns Sponsored transaction status.
   */
  getSponsoredTransactionBlockStatus(
    txDigest: string
  ): Promise<SponsoredTransactionStatus> {
    return this.request(
      "gas_getSponsoredTransactionBlockStatus",
      [txDigest],
      SponsoredTransactionStatus
    );
  }

  /**
   * Queries the fund associated with the access key.   
   * @returns The fund information. 
   */
  getFund(): Promise<Fund> {
    return this.request(
      "gas_getFund",
      [],
      Fund,
    );
  }
}

/**
 * Builds a gasless transaction.
 * @param sui Sui JSON RPC provider.
 * @param txb Optional base `TransactionBlock`. An empty one will be used if not specified.
 * @param build Optional builder function to further populate the base `TransactionBlock`.
 * @returns Base64 encoded gasless transaction bytes that can be passed to `sponsorTransactionBlock`
 *    request.
 */
export async function buildGaslessTransactionBytes({
  sui,
  txb,
  build,
}: {
  sui: SuiClient;
  txb?: TransactionBlock;
  build?: (txb: TransactionBlock) => Promise<void>;
}): Promise<string> {
  const _txb = txb ?? new TransactionBlock();
  if (build) await build(_txb);
  return toB64(
    await _txb.build({
      client: sui,
      onlyTransactionKind: true,
    })
  );
}
