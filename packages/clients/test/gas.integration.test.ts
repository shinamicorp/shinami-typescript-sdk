/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeAll, describe, expect, it } from "@jest/globals";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import { buildGaslessTransactionBytes } from "../src/index.js";
import {
  EXAMPLE_PACKAGE_ID,
  createGasClient,
  createSuiClient,
} from "./integration.env.js";

const sui = createSuiClient();
const gas = createGasClient();

const keypair = new Ed25519Keypair();

describe("GasStationClient", () => {
  beforeAll(async () => {
    console.log("sui address", keypair.toSuiAddress());
    console.log("private key", keypair.export().privateKey);
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

  const happyTest = (gasBudget?: number) => async () => {
    const txBytes = await buildGaslessTransactionBytes({
      sui,
      build: async (txb) => {
        txb.moveCall({
          target: `${EXAMPLE_PACKAGE_ID}::math::add`,
          arguments: [txb.pure(1), txb.pure(2)],
        });
      },
    });

    const sponsoredTx = await gas.sponsorTransactionBlock(
      txBytes,
      keypair.toSuiAddress(),
      gasBudget
    );
    console.log("sponsoredTx", sponsoredTx);
    expect(
      await gas.getSponsoredTransactionBlockStatus(sponsoredTx.txDigest)
    ).toBe("IN_FLIGHT");

    const signedTx = await keypair.signTransactionBlock(
      fromB64(sponsoredTx.txBytes)
    );
    expect(signedTx.bytes).toBe(sponsoredTx.txBytes);

    const txResp = await sui.executeTransactionBlock({
      transactionBlock: signedTx.bytes,
      signature: [signedTx.signature, sponsoredTx.signature],
      options: {
        showEffects: true,
        showEvents: true,
      },
    });
    console.log("txResp", txResp);
    expect(txResp).toMatchObject({
      effects: {
        status: {
          status: "success",
        },
      },
      events: [
        {
          type: `${EXAMPLE_PACKAGE_ID}::math::AddResult`,
          parsedJson: {
            result: "3",
          },
        },
      ],
    });
  };

  it(
    "successfully requests gas sponsorship, gets inflight status, and executes tx",
    happyTest(2_000_000),
    30_000
  );

  it(
    "successfully requests gas sponsorship with auto budget, gets inflight status, and executes tx",
    happyTest(),
    30_000
  );

  it("fails to get sponsorship for invalid transaction", async () => {
    await expect(
      gas.sponsorTransactionBlock("fake tx bytes", "0x00", 1_000_000)
    ).rejects.toThrow("Invalid params");
  });
});
