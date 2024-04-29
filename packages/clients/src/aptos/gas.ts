/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccountAddress,
  AccountAuthenticator,
  AnyRawTransaction,
  Deserializer,
} from "@aptos-labs/ts-sdk";
import { Infer, array, integer, object, string } from "superstruct";
import { ShinamiRpcClient } from "../rpc.js";

const GAS_STATION_RPC_URL = "https://api.shinami.com/aptos/gas/v1";

const RpcAccountSignature = object({
  address: string(),
  signature: array(integer()),
});
type RpcAccountSignature = Infer<typeof RpcAccountSignature>;

const SponsorTransactionResult = object({
  feePayer: RpcAccountSignature,
});
type SponsorTransactionResult = Infer<typeof SponsorTransactionResult>;

/**
 * Aptos gas station RPC client.
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
   * Sponsors a transaction by filling in fee payer address and providing fee payer signature.
   *
   * @param transaction The transaction to request sponsorship for.
   *    Note that `transaction.feePayerAddress` is updated in-place upon successful return.
   * @returns Fee payer signature, to be used in transaction submission.
   */
  async sponsorTransaction(
    transaction: AnyRawTransaction,
  ): Promise<AccountAuthenticator> {
    const { feePayer } = await this.request(
      "gas_sponsorTransaction",
      [
        transaction.rawTransaction.bcsToHex().toString(),
        transaction.secondarySignerAddresses?.map((x) => x.toString()),
      ],
      SponsorTransactionResult,
    );

    const sig = AccountAuthenticator.deserialize(
      new Deserializer(new Uint8Array(feePayer.signature)),
    );
    transaction.feePayerAddress = AccountAddress.fromString(feePayer.address);
    return sig;
  }
}
