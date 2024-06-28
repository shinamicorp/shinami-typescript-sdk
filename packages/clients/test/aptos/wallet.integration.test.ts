/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "@jest/globals";
import { v4 as uuidv4 } from "uuid";
import { KeySession, ShinamiWalletSigner } from "../../src/aptos/index.js"
import {
  EXAMPLE_PACKAGE_ID,
  createAptos,
  createWalletClient,
  createKeyClient,
} from "./integration.env.js";
import { 
  AccountAddress, 
  Deserializer, 
  AccountAuthenticator, 
  AccountAuthenticatorEd25519, 
  isUserTransactionResponse 
} from "@aptos-labs/ts-sdk";

const aptos = createAptos();
const key = createKeyClient();
const wal = createWalletClient();

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
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
  const walletId = `__wallet_sdk_test_${uuidv4()}`;
  const session = new KeySession("fake secret", key);
  const signer1 = new ShinamiWalletSigner(walletId, wal, "fake secret", key);
  const signer2 = new ShinamiWalletSigner(walletId, wal, session);
  console.log("walletId", walletId);

  it("creates and retrieves an initialized wallet address", async() => {
    const createdAddress = await signer2.getAddress(true, true)
    expect(createdAddress).toMatch(/0x[0-9a-f]+/);
    await delay(3_000);   // allow iniaitlized address to propagate on chain
    const accountInfo = await aptos.account.getAccountInfo({accountAddress: createdAddress});
    expect(accountInfo.authentication_key).toBe(createdAddress);
  }, 20_000);

  it("creates and retrieves an uninitialized wallet address", async() => {
    expect(await signer1.getAddress(true, false)).toMatch(/0x[0-9a-f]+/);
  });

  it("signs a simple transaction correctly", async() => {
    const senderAcct = AccountAddress.from(await signer1.getAddress(true, true));
    const receiverAcct = AccountAddress.from(await signer2.getAddress(true, true));
    await delay(3_000);
    const transaction = await aptos.transaction.build.simple({
      sender: senderAcct,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [receiverAcct, 0],
      },
      withFeePayer: false,
      options : {
        expireTimestamp: Math.floor(Date.now() / 1000) + 60,
      },
    });

    const signTransactionResult = await signer1.signTransaction(transaction);
    const signingMessage = aptos.getSigningMessage({transaction})
  
    const accountAuthenticator = AccountAuthenticator.deserialize(
      new Deserializer(Uint8Array.from(signTransactionResult.signature)),
    );
    const accountAuthenticatorEd25519 = (accountAuthenticator as AccountAuthenticatorEd25519);
    const verifyResult = accountAuthenticatorEd25519.public_key.verifySignature(
      {message: signingMessage, signature: accountAuthenticatorEd25519.signature}
    );
    expect(verifyResult).toBe(true);
  }, 20_000);

  it("signs multi-agent transaction correctly", async() => {
    const senderAcct = AccountAddress.from(await signer1.getAddress(true, true));
    const receiverAcct = AccountAddress.from(await signer2.getAddress(true, true));
    await delay(3_000);
    const transaction = await aptos.transaction.build.multiAgent({
      sender: senderAcct,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [receiverAcct, 0],
      },
      secondarySignerAddresses: [receiverAcct],
      withFeePayer: false,
      options : {
        expireTimestamp: Math.floor(Date.now() / 1000) + 60,
      },
    });

    const signTransactionResult = await signer1.signTransaction(transaction);
    const signingMessage = aptos.getSigningMessage({transaction})
    const accountAuthenticator = AccountAuthenticator.deserialize(
      new Deserializer(Uint8Array.from(signTransactionResult.signature)),
    );
    const accountAuthenticatorEd25519 = (accountAuthenticator as AccountAuthenticatorEd25519);

    const pending = aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: accountAuthenticatorEd25519
    });

    const verifyResult = accountAuthenticatorEd25519.public_key.verifySignature(
     {message: signingMessage, signature: accountAuthenticatorEd25519.signature}
   );
   expect(verifyResult).toBe(true);
  }, 20_000);

  it("executes a simple transaction gaslessly", async() => {
    const senderAcct = AccountAddress.from(await signer1.getAddress(true));
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
  }, 20_000);
});
