import { beforeEach, describe, expect, it } from "@jest/globals";
import { IntentScope, verifyMessage } from "@mysten/sui.js";
import { v4 as uuidv4 } from "uuid";
import { ShinamiWalletSigner, buildGaslessTransactionBytes } from "../src";
import {
  EXAMPLE_PACKAGE_ID,
  createKeyClient,
  createSuiClient,
  createWalletClient,
} from "./integration.env";

const key = createKeyClient();
const wal = createWalletClient();
const sui = createSuiClient();

describe("KeyClient", () => {
  it("discovers OpenRPC spec", async () => {
    expect(await key.rpcDiscover()).toMatchObject({
      openrpc: "1.2.6",
      info: {
        title: "Shinami Key service RPC",
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
  const signer = new ShinamiWalletSigner(walletId, "fake secret", key, wal);
  console.log("walletId", walletId);

  beforeEach(async () => {
    await signer.tryCreate();
  });

  it("retrieves address", async () => {
    expect(await signer.getAddress()).toMatch(/0x[0-9a-f]+/);
  });

  it("signs a transaction block", async () => {
    const txBytes = Uint8Array.from([1, 2, 3]);
    const { signature } = await signer.signTransactionBlock(txBytes);
    expect(
      await verifyMessage(txBytes, signature, IntentScope.TransactionData)
    ).toBe(true);
  });

  it("signs a personal message", async () => {
    const message = Uint8Array.from([1, 2, 3]);
    const signature = await signer.signPersonalMessage(message);
    expect(
      await verifyMessage(message, signature, IntentScope.PersonalMessage)
    ).toBe(true);
  });

  it("executes gasless transaction block", async () => {
    const gaslessTx = await buildGaslessTransactionBytes({
      sui,
      build: async (txb) => {
        txb.moveCall({
          target: `${EXAMPLE_PACKAGE_ID}::math::add`,
          arguments: [txb.pure(1), txb.pure(2)],
        });
      },
    });
    const txResp = await signer.executeGaslessTransactionBlock(
      gaslessTx,
      5_000_000,
      { showEffects: true, showEvents: true }
    );
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
  });
});
