import { beforeAll, describe, expect, it } from "@jest/globals";
import { Ed25519Keypair, RawSigner, fromB64 } from "@mysten/sui.js";
import { buildGaslessTransactionBytes } from "../src";
import {
  EXAMPLE_PACKAGE_ID,
  createGasClient,
  createSuiClient,
} from "./integration.env";

const sui = createSuiClient();
const gas = createGasClient();

const keypair = new Ed25519Keypair();
const signer = new RawSigner(keypair, sui);

describe("GasStationClient", () => {
  beforeAll(async () => {
    console.log("sui address", await signer.getAddress());
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

  it("successfully requests gas sponsorship, gets inflight status, and executes tx", async () => {
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
      await signer.getAddress(),
      2_000_000
    );
    console.log("sponsoredTx", sponsoredTx);
    expect(
      await gas.getSponsoredTransactionBlockStatus(sponsoredTx.txDigest)
    ).toBe("IN_FLIGHT");

    const signedTx = await signer.signTransactionBlock({
      transactionBlock: fromB64(sponsoredTx.txBytes),
    });
    expect(signedTx.transactionBlockBytes).toBe(sponsoredTx.txBytes);

    const txResp = await sui.executeTransactionBlock({
      transactionBlock: signedTx.transactionBlockBytes,
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
  });

  it("fails to get sponsorship for invalid transaction", async () => {
    await expect(
      gas.sponsorTransactionBlock("fake tx bytes", "0x00", 1_000_000)
    ).rejects.toThrow("Invalid params");
  });
});
