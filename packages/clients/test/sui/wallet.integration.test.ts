/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "@jest/globals";
import {
  verifyPersonalMessageSignature,
  verifyTransactionSignature,
} from "@mysten/sui/verify";
import { v4 as uuidv4 } from "uuid";
import {
  EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
  KeySession,
  ShinamiWalletSigner,
  buildGaslessTransaction,
} from "../../src/sui/index.js";
import {
  EXAMPLE_PACKAGE_ID,
  createKeyClient,
  createSuiClient,
  createWalletClient,
} from "./integration.env.js";

const key = createKeyClient();
const wal = createWalletClient();
const sui = createSuiClient();

describe("KeyClient", () => {
  it("discovers OpenRPC spec", async () => {
    expect(await key.rpcDiscover()).toMatchObject({
      openrpc: "1.2.6",
      info: {
        title: "Shinami Sui Key service RPC",
        version: /\d+\.\d+\.\d+/,
      },
    });
  });
});

describe("WalletClient", () => {
  it("discovers OpenRPC spec", async () => {
    expect(await wal.rpcDiscover()).toMatchObject({
      openrpc: "1.2.6",
      info: {
        title: "Shinami Wallet service RPC",
        version: /\d+\.\d+\.\d+/,
      },
    });
  });
});

describe("ShinamiWallet", () => {
  const walletId = `__wallet_sdk_test_${uuidv4()}`;
  const session = new KeySession("fake secret", key);
  const signer = new ShinamiWalletSigner(walletId, wal, "fake secret", key);
  const signer2 = new ShinamiWalletSigner(walletId, wal, session);
  const signer3 = new ShinamiWalletSigner(walletId, wal, session);
  console.log("walletId", walletId);

  it("creates and retrieves address", async () => {
    expect(await signer.getAddress(true)).toMatch(/0x[0-9a-f]+/);
  });

  it("is safe to call tryCreate again", async () => {
    await signer.tryCreate();
  });

  it("signs a transaction block", async () => {
    const txBytes = Uint8Array.from([1, 2, 3]);
    const { signature } = await signer.signTransaction(txBytes);
    const pubKey = await verifyTransactionSignature(txBytes, signature);
    expect(pubKey.toSuiAddress()).toBe(await signer.getAddress());
  });

  it("signs a personal message", async () => {
    const message = Uint8Array.from([1, 2, 3]);
    const signature = await signer2.signPersonalMessage(message);
    const pubKey = await verifyPersonalMessageSignature(message, signature);
    expect(pubKey.toSuiAddress()).toBe(await signer2.getAddress());
  });

  const executeAddTx =
    (x: number, y: number, gasBudget?: number) => async () => {
      const gaslessTx = await buildGaslessTransaction(
        (txb) => {
          txb.moveCall({
            target: `${EXAMPLE_PACKAGE_ID}::math::add`,
            arguments: [txb.pure.u64(x), txb.pure.u64(y)],
          });
        },
        { gasBudget },
      );
      const txResp = await signer3.executeGaslessTransaction(gaslessTx, {
        showEffects: true,
        showEvents: true,
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
              result: (x + y).toString(),
            },
          },
        ],
      });
    };

  it(
    "executes gasless transaction block",
    executeAddTx(1, 2, 2_000_000),
    30_000,
  );

  it(
    "executes gasless transaction block with auto budget",
    executeAddTx(3, 4),
    30_000,
  );

  it("sets a beneficiary address and gets it back", async () => {
    const beneficiary =
      "0x0000000000000000000000000000000000000000000000000000000000001111";
    const txDigest = await signer.setBeneficiary(
      EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
      beneficiary,
    );
    console.log("txDigest", txDigest);
    expect(
      signer.getBeneficiary(EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET),
    ).resolves.toBe(beneficiary);
  }, 30_000);

  it("sets another beneficiary address and gets it back", async () => {
    const beneficiary =
      "0x0000000000000000000000000000000000000000000000000000000000002222";
    const txDigest = await signer.setBeneficiary(
      EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
      beneficiary,
    );
    console.log("txDigest", txDigest);
    expect(
      signer.getBeneficiary(EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET),
    ).resolves.toBe(beneficiary);
  }, 30_000);

  it("unsets beneficiary address", async () => {
    const txDigest = await signer.unsetBeneficiary(
      EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET,
    );
    console.log("txDigest", txDigest);
    expect(
      signer.getBeneficiary(EXAMPLE_BENEFICIARY_GRAPH_ID_TESTNET),
    ).resolves.toBe(null);
  }, 30_000);
});
