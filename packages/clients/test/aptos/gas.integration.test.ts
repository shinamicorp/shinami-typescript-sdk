/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Account,
  AptosApiError,
  Hex,
  InputGenerateTransactionOptions,
  isUserTransactionResponse,
  MimeType,
  PendingTransactionResponse,
  postAptosFullNode,
  SigningSchemeInput,
} from "@aptos-labs/ts-sdk";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { JSONRPCError } from "@open-rpc/client-js";
import {
  createAptos,
  createGasClient,
  EXAMPLE_PACKAGE_ID,
} from "./integration.env.js";

const aptos = createAptos();
const gas = createGasClient();

const account = Account.generate({
  scheme: SigningSchemeInput.Ed25519,
  legacy: true,
});

describe("GasStationClient", () => {
  beforeAll(async () => {
    console.log("account address", account.accountAddress.toString());
    console.log(
      "private key",
      new Hex(account.privateKey.toUint8Array()).toString(),
    );
  });

  it("discovers OpenRPC spec", async () => {
    expect(await gas.rpcDiscover()).toMatchObject({
      openrpc: "1.2.6",
      info: {
        title: "Shinami gas station RPC for Aptos",
        version: /\d+\.\d+\.\d+/,
      },
    });
  });

  const happyTest = (options?: InputGenerateTransactionOptions) => async () => {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
        functionArguments: [1, 2],
      },
      withFeePayer: true,
      options,
    });

    let feePayerSig;
    try {
      feePayerSig = await gas.sponsorTransaction(transaction);
      console.log("feePayerSig", feePayerSig);
    } catch (e) {
      if (e instanceof JSONRPCError) {
        console.error("JSONRPCError", e.message, e.data);
      }
      throw e;
    }

    const senderSig = aptos.transaction.sign({
      signer: account,
      transaction,
    });

    const pending = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: feePayerSig,
    });
    console.log("pending", pending);

    const committed = await aptos.transaction.waitForTransaction({
      transactionHash: pending.hash,
      options: {
        checkSuccess: true,
      },
    });
    console.log("committed", committed);
    if (!isUserTransactionResponse(committed)) {
      throw new Error("Unexpected committed transaction type");
    }

    expect(
      committed.events.find(
        (x) => x.type == `${EXAMPLE_PACKAGE_ID}::math::Result`,
      ),
    ).toMatchObject({
      data: {
        result: "3", // 1 + 2
      },
    });
  };

  it(
    "successfully requests gas sponsorship and executes tx with default options",
    happyTest(),
    30_000,
  );

  it(
    "successfully requests gas sponsorship and executes tx with 50min expiration",
    happyTest({
      expireTimestamp: Math.floor(Date.now() / 1000) + 50 * 60,
    }),
    30_000,
  );

  it("fails to request gas sponsorship with 70min expiration", async () => {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
        functionArguments: [1, 2],
      },
      withFeePayer: true,
      options: {
        expireTimestamp: Math.floor(Date.now() / 1000) + 70 * 60,
      },
    });

    await expect(gas.sponsorTransaction(transaction)).rejects.toThrow(
      "Invalid params",
    );
  }, 30_000);

  it("successfully sponsors and submits transaction", async () => {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
        functionArguments: [1, 2],
      },
      withFeePayer: true,
    });

    const senderSig = aptos.transaction.sign({
      signer: account,
      transaction,
    });

    const pending = await gas.sponsorAndSubmitSignedTransaction(
      transaction,
      senderSig,
    );
    console.log("pending", pending);

    const committed = await aptos.transaction.waitForTransaction({
      transactionHash: pending.hash,
      options: {
        checkSuccess: true,
      },
    });
    console.log("committed", committed);
    if (!isUserTransactionResponse(committed)) {
      throw new Error("Unexpected committed transaction type");
    }

    expect(
      committed.events.find(
        (x) => x.type == `${EXAMPLE_PACKAGE_ID}::math::Result`,
      ),
    ).toMatchObject({
      data: {
        result: "3", // 1 + 2
      },
    });
  }, 30_000);

  it("fails to sponsor and submit transaction with bad signature", async () => {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
        functionArguments: [1, 2],
      },
      withFeePayer: true,
    });

    const badSig = aptos.transaction.sign({
      signer: Account.generate(),
      transaction,
    });

    const promise = gas.sponsorAndSubmitSignedTransaction(transaction, badSig);
    await expect(promise).rejects.toThrow(JSONRPCError);
    await expect(promise).rejects.toThrow("Transaction submission failed");
  }, 30_000);

  // Not really testing the SDK, but directly testing the JSON transaction sponsorship RPC.
  it("successfully encodes, sponsors, and submits JSON transaction", async () => {
    let sequence_number: string;
    try {
      sequence_number = (
        await aptos.account.getAccountInfo({
          accountAddress: account.accountAddress,
        })
      ).sequence_number;
    } catch (e) {
      if (
        e instanceof AptosApiError &&
        e.data?.error_code === "account_not_found"
      )
        sequence_number = "0";
      else throw e;
    }
    const { gas_estimate } = await aptos.getGasPriceEstimation();

    const submission = {
      sender: account.accountAddress.toString(),
      sequence_number,
      max_gas_amount: "1000",
      gas_unit_price: gas_estimate.toString(),
      expiration_timestamp_secs: (
        Math.floor(Date.now() / 1000) + 30
      ).toString(),
      payload: {
        type: "entry_function_payload",
        function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
        type_arguments: [],
        arguments: ["1", "2"],
      },
    };

    // Directly call the JSON-RPC method with the transaction submission JSON.
    // We didn't include this method in the SDK because we don't expect people to use it when they
    // can already perform BCS encoding through Aptos SDK.
    const {
      transactionSigningMessage,
      feePayerAddress,
      feePayerSignature,
    }: {
      transactionSigningMessage: number[];
      feePayerAddress: string;
      feePayerSignature: unknown;
    } = await gas.request("gas_encodeAndSponsorTransaction", [submission]);

    const senderSig = account.sign(new Uint8Array(transactionSigningMessage));

    // Directly post the JSON submission (with fee payer and signatures) to the fullnode, because
    // Aptos SDK doesn't have a helper for this scenario either.
    // Note that `submission` is identical between the sponsorship call and the submission call.
    const { data: pending } = await postAptosFullNode<
      object,
      PendingTransactionResponse
    >({
      aptosConfig: aptos.config,
      originMethod: "submitTransaction",
      path: "transactions",
      contentType: MimeType.JSON,
      acceptType: MimeType.JSON,
      body: {
        ...submission,
        signature: {
          type: "fee_payer_signature",
          sender: {
            type: "ed25519_signature",
            public_key: account.publicKey.toString(),
            signature: senderSig.toString(),
          },
          secondary_signer_addresses: [],
          secondary_signers: [],
          fee_payer_address: feePayerAddress,
          fee_payer_signer: feePayerSignature,
        },
      },
    });
    console.log("pending", pending);

    const committed = await aptos.transaction.waitForTransaction({
      transactionHash: pending.hash,
      options: {
        checkSuccess: true,
      },
    });
    console.log("committed", committed);
    if (!isUserTransactionResponse(committed)) {
      throw new Error("Unexpected committed transaction type");
    }

    expect(
      committed.events.find(
        (x) => x.type == `${EXAMPLE_PACKAGE_ID}::math::Result`,
      ),
    ).toMatchObject({
      data: {
        result: "3", // 1 + 2
      },
    });
  }, 30_000);
});
