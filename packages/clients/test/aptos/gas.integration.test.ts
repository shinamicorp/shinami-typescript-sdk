/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Account,
  Hex,
  InputGenerateTransactionOptions,
  SigningSchemeInput,
  isUserTransactionResponse,
} from "@aptos-labs/ts-sdk";
import { beforeAll, describe, expect, it } from "@jest/globals";
import {
  EXAMPLE_PACKAGE_ID,
  createAptos,
  createGasClient,
} from "./integration.env.js";

const aptos = createAptos();
const gas = createGasClient();

const account = Account.generate({
  scheme: SigningSchemeInput.Ed25519,
  legacy: false,
});

// TODO - turn on once public API goes live
describe.skip("GasStationClient", () => {
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
        title: "Shinami Gas Station RPC",
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

    const feePayerSig = await gas.sponsorTransaction(transaction);
    console.log("feePayerSig", feePayerSig);

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
      expireTimestamp: Date.now() / 1000 + 50 * 60,
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
        expireTimestamp: Date.now() / 1000 + 70 * 60,
      },
    });

    await expect(gas.sponsorTransaction(transaction)).rejects.toThrow(
      "Invalid params",
    );
  }, 30_000);
});