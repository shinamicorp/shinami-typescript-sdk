/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from "@jest/globals";
import { createAptos } from "./integration.env";
import { SingleKeyAccount, SigningSchemeInput } from "@aptos-labs/ts-sdk";

const aptos = createAptos();

describe("Shinami Aptos client", () => {
  it("should query via REST API", async () => {
    const state = await aptos.getLedgerInfo();
    expect(state).toMatchObject({
      block_height: expect.stringMatching(/[0-9]+/),
      chain_id: /^[0-2]$/,
      epoch: expect.stringMatching(/[0-9]+/),
      git_hash: expect.stringMatching(/[0-9a-f]{5,40}/),
      ledger_timestamp: expect.stringMatching(/[0-9]+/),
      node_role: expect.stringMatching("full_node"),
      oldest_block_height: expect.stringMatching(/[0-9]+/),
      oldest_ledger_version: expect.stringMatching(/[0-9]+/),
    });
  });

  it("should query GraphQL successfully", async () => {
    const ledgerInfo = await aptos.queryIndexer({
      query: {
        query: `
                query IntegrationTestQuery {
                  ledger_infos {
                    chain_id
                  }
                }
              `,
      },
    });
    expect(ledgerInfo).toMatchObject({
      ledger_infos: [
        {
          chain_id: /^[0-2]$/,
        },
      ],
    });
  });

  it("should query Aptos's Faucet using the native client", async () => {
    const account: SingleKeyAccount = SingleKeyAccount.generate({
      scheme: SigningSchemeInput.Ed25519,
    });
    const fundResp = await aptos.fundAccount({
      accountAddress: account.accountAddress,
      amount: 100000000,
      options: {
        waitForIndexer: false,
      },
    });
    console.log(fundResp);
  });
});
