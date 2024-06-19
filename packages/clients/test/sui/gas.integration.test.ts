/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeAll, describe, expect, it } from "@jest/globals";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/sui/utils";
import { buildGaslessTransaction } from "../../src/sui/index.js";
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
    console.log("private key", keypair.getSecretKey());
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
    const gaslessTx = await buildGaslessTransaction((txb) => {
      txb.moveCall({
        target: `${EXAMPLE_PACKAGE_ID}::math::add`,
        arguments: [txb.pure.u64(1), txb.pure.u64(2)],
      });
      txb.setSender(keypair.toSuiAddress());
      if (gasBudget) txb.setGasBudget(gasBudget);
    });

    const sponsoredTx = await gas.sponsorTransaction(gaslessTx);
    console.log("sponsoredTx", sponsoredTx);
    expect(await gas.getSponsoredTransactionStatus(sponsoredTx.txDigest)).toBe(
      "IN_FLIGHT",
    );

    const signedTx = await keypair.signTransaction(
      fromB64(sponsoredTx.txBytes),
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
    30_000,
  );

  it(
    "successfully requests gas sponsorship with auto budget, gets inflight status, and executes tx",
    happyTest(),
    30_000,
  );

  it("fails to get sponsorship for invalid transaction", async () => {
    await expect(
      gas.sponsorTransaction({
        txKind: "fake tx bytes",
        sender: "0x00",
        gasBudget: 1_000_000,
      }),
    ).rejects.toThrow("Invalid params");
  });

  it("successfully query fund information", async () => {
    expect(await gas.getFund()).toBeDefined();
  });
});
