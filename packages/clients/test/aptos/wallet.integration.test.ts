/**
 * Copyright 2023-2025 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccountAddress,
  AccountAuthenticatorEd25519,
  AptosApiError,
  isUserTransactionResponse,
} from "@aptos-labs/ts-sdk";
import { describe, expect, it } from "@jest/globals";
import { JSONRPCError } from "@open-rpc/client-js";
import { v4 as uuidv4 } from "uuid";
import { KeySession, ShinamiWalletSigner } from "../../src/aptos/index.js";
import {
  EXAMPLE_PACKAGE_ID,
  createAptos,
  createKeyClient,
  createWalletClient,
} from "./integration.env.js";

const aptos = createAptos();
const key = createKeyClient();
const wal = createWalletClient();
const longTimeoutMs = 30_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccountResourceWithRetry(
  accountAddress: AccountAddress,
  maxRetries: number = 6,
  delayMs: number = 500,
): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await aptos.account.getAccountResource({
        accountAddress,
        resourceType: "0x1::account::Account",
      });
    } catch (error) {
      if (error instanceof AptosApiError && attempt < maxRetries - 1) {
        await delay(delayMs);
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Failed to get account info after ${maxRetries} attempts.`);
}

describe("KeyClient", () => {
  it("discovers OpenRPC spec", async () => {
    expect(await key.rpcDiscover()).toMatchObject({
      openrpc: "1.2.6",
      info: {
        title: "Shinami Aptos Key service RPC",
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
        title: "Shinami wallet service RPC for Aptos",
        version: /\d+\.\d+\.\d+/,
      },
    });
  });
});

describe("ShinamiAptosWallet", () => {
  const walletId1 = `__wallet_sdk_test_${uuidv4()}`;
  const walletId2 = `__wallet_sdk_test_${uuidv4()}`;
  const walletId3 = `__wallet_sdk_test_${uuidv4()}`;
  const session = new KeySession("fake secret", key);
  const signer1 = new ShinamiWalletSigner(walletId1, wal, "fake secret", key);
  const signer2 = new ShinamiWalletSigner(walletId2, wal, session);
  const signer3 = new ShinamiWalletSigner(walletId3, wal, session);

  console.log("walletId1", walletId1); // will be initialized on chain
  console.log("walletId2", walletId2);
  console.log("walletId3", walletId3);

  it("creates and retrieves an initialized wallet address", async () => {
    const createdAddress = await signer1.getAddress(true, true);
    expect(createdAddress.toString()).toMatch(/0x[0-9a-f]+/);
    const account = await getAccountResourceWithRetry(createdAddress);
    expect(account.authentication_key).toBe(createdAddress.toString());
  }, 20_000);

  it("creates and retrieves an uninitialized wallet address", async () => {
    expect((await signer2.getAddress(true, false)).toString()).toMatch(
      /0x[0-9a-f]+/,
    );
  });

  it(
    "throws error when initializing an uncreated wallet",
    async () => {
      try {
        await signer3.getAddress(false, false);
        throw new Error("Error not thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(JSONRPCError);
        expect((error as JSONRPCError).message).toBe("Invalid params");
      }
    },
    longTimeoutMs,
  );

  it(
    "initializes and retrieves a created wallet on chain correctly",
    async () => {
      let createdAddress = await signer3.getAddress(true, false);
      expect(createdAddress.toString()).toMatch(/0x[0-9a-f]+/);

      // Only created in Shinami. Should not be on chain.
      await expect(getAccountResourceWithRetry(createdAddress)).rejects.toThrow(
        AptosApiError,
      );

      // Should still correctly fetch address from Shinami if off chain.
      createdAddress = await signer3.getAddress(false, false);
      expect(createdAddress.toString()).toMatch(/0x[0-9a-f]+/);

      createdAddress = await signer3.getAddress(false, true);
      expect(createdAddress.toString()).toMatch(/0x[0-9a-f]+/);

      const account = await getAccountResourceWithRetry(createdAddress);
      // Should now be initialized on chain.
      expect(account.authentication_key).toBe(createdAddress.toString());
    },
    longTimeoutMs,
  );

  it(
    "signs a simple transaction with fee payer correctly",
    async () => {
      const senderAcct = await signer1.getAddress(true);
      const receiverAcct = await signer2.getAddress(true, false);

      const transaction = await aptos.transaction.build.simple({
        sender: senderAcct,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [receiverAcct, 0],
        },
        withFeePayer: true,
        options: {
          expireTimestamp: Math.floor(Date.now() / 1000) + 60,
        },
      });

      const accountAuthenticator = await signer1.signTransaction(transaction);
      const signingMessage = aptos.getSigningMessage({ transaction });
      const accountAuthenticatorEd25519 =
        accountAuthenticator as AccountAuthenticatorEd25519;
      const verifyResult =
        accountAuthenticatorEd25519.public_key.verifySignature({
          message: signingMessage,
          signature: accountAuthenticatorEd25519.signature,
        });
      expect(verifyResult).toBe(true);
    },
    longTimeoutMs,
  );

  it(
    "signs a simple transaction without feepayer correctly",
    async () => {
      // Sender must be on chain since it will also be the fee payer
      const senderAcct = await signer1.getAddress(true, true);
      await getAccountResourceWithRetry(senderAcct);
      const receiverAcct = await signer2.getAddress(true, false);

      const transaction = await aptos.transaction.build.simple({
        sender: senderAcct,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [receiverAcct, 0],
        },
        withFeePayer: false,
        options: {
          expireTimestamp: Math.floor(Date.now() / 1000) + 60,
        },
      });

      const accountAuthenticator = await signer1.signTransaction(transaction);
      const signingMessage = aptos.getSigningMessage({ transaction });
      const accountAuthenticatorEd25519 =
        accountAuthenticator as AccountAuthenticatorEd25519;
      const verifyResult =
        accountAuthenticatorEd25519.public_key.verifySignature({
          message: signingMessage,
          signature: accountAuthenticatorEd25519.signature,
        });
      expect(verifyResult).toBe(true);
    },
    longTimeoutMs,
  );

  it(
    "signs multi-agent transaction correctly",
    async () => {
      const senderAcct = await signer1.getAddress(true, true);
      await getAccountResourceWithRetry(senderAcct);
      const receiverAcct = await signer2.getAddress(true, false);

      const transaction = await aptos.transaction.build.multiAgent({
        sender: senderAcct,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [receiverAcct, 0],
        },
        secondarySignerAddresses: [receiverAcct],
        withFeePayer: false,
        options: {
          expireTimestamp: Math.floor(Date.now() / 1000) + 60,
        },
      });

      const accountAuthenticator = await signer1.signTransaction(transaction);
      const signingMessage = aptos.getSigningMessage({ transaction });

      const accountAuthenticatorEd25519 =
        accountAuthenticator as AccountAuthenticatorEd25519;
      const verifyResult =
        accountAuthenticatorEd25519.public_key.verifySignature({
          message: signingMessage,
          signature: accountAuthenticatorEd25519.signature,
        });
      expect(verifyResult).toBe(true);
    },
    longTimeoutMs,
  );

  it(
    "executes a simple transaction gaslessly",
    async () => {
      const senderAcct = await signer1.getAddress(true);
      const transaction = await aptos.transaction.build.simple({
        sender: senderAcct,
        data: {
          function: `${EXAMPLE_PACKAGE_ID}::math::add_entry`,
          functionArguments: [1, 2],
        },
        withFeePayer: true,
        options: {
          expireTimestamp: Math.floor(Date.now() / 1000) + 5 * 60,
        },
      });
      const pending = await signer1.executeGaslessTransaction(transaction);
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
    },
    longTimeoutMs,
  );
});
