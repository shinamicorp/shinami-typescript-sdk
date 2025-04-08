/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccountAddress,
  AccountAuthenticator,
  AnyRawTransaction,
  Deserializer,
  MultiAgentTransaction,
  PendingTransactionResponse,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import {
  Infer,
  array,
  integer,
  nullable,
  object,
  string,
  unknown,
} from "superstruct";
import { ShinamiRpcClient, trimTrailingParams } from "../rpc.js";
import { Region } from "../region.js";
import { GasStationRpcUrl } from "./endpoints.js";

const RpcAccountSignature = object({
  address: string(),
  signature: array(integer()),
});
type RpcAccountSignature = Infer<typeof RpcAccountSignature>;

const SponsorTransactionResult = object({
  feePayer: RpcAccountSignature,
});
type SponsorTransactionResult = Infer<typeof SponsorTransactionResult>;

const SponsorAndSubmitSignedTransactionResult = object({
  pendingTransaction: unknown(),
});
type SponsorAndSubmitSignedTransactionResult = Infer<
  typeof SponsorAndSubmitSignedTransactionResult
>;

const Fund = object({
  network: string(),
  name: string(),
  balance: integer(),
  inFlight: integer(),
  depositAddress: nullable(string()),
});
type Fund = Infer<typeof Fund>;

/**
 * Aptos gas station RPC client.
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
      trimTrailingParams([
        transaction.rawTransaction.bcsToHex().toString(),
        transaction.secondarySignerAddresses?.map((x) => x.toString()),
      ]),
      SponsorTransactionResult,
    );

    const sig = AccountAuthenticator.deserialize(
      new Deserializer(new Uint8Array(feePayer.signature)),
    );
    transaction.feePayerAddress = AccountAddress.fromString(feePayer.address);
    return sig;
  }

  /**
   * Sponsors a simple transaction by filling in fee payer info and submits it to Aptos network for
   * execution.
   *
   * @param transaction The simple transaction to request sponsorship for.
   * @param senderSignature Sender signature.
   * @returns The submitted transaction in mempool.
   */
  async sponsorAndSubmitSignedTransaction(
    transaction: SimpleTransaction,
    senderSignature: AccountAuthenticator,
  ): Promise<PendingTransactionResponse>;

  /**
   * Sponsors a multi-agent transaction by filling in fee payer info and submits it to Aptos network
   * for execution.
   *
   * @param transaction The multi-agent transaction to request sponsorship for.
   * @param senderSignature Sender signature.
   * @param secondarySignatures Secondary signer signatures.
   * @returns The submitted transaction in mempool.
   */
  async sponsorAndSubmitSignedTransaction(
    transaction: MultiAgentTransaction,
    senderSignature: AccountAuthenticator,
    secondarySignatures: AccountAuthenticator[],
  ): Promise<PendingTransactionResponse>;

  async sponsorAndSubmitSignedTransaction(
    transaction: AnyRawTransaction,
    senderSignature: AccountAuthenticator,
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
      "gas_sponsorAndSubmitSignedTransaction",
      [
        transaction.rawTransaction.bcsToHex().toString(),
        senderSignature.bcsToHex().toString(),
        secondarySigners,
      ],
      SponsorAndSubmitSignedTransactionResult,
    );
    return pendingTransaction as PendingTransactionResponse;
  }

  /**
   * Gets information about the fund associated with the access key.
   */
  async getFund(): Promise<Fund> {
    return await this.request("gas_getFund", [], Fund);
  }
}
