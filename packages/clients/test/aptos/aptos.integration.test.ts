/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect, test } from "@jest/globals";
import { createAptos } from "./integration.env";

const aptos = createAptos();

test("Shinami Aptos client can query Node Service", async () => {
  const state = await aptos.getLedgerInfo();
  expect(state).toMatchObject({
    block_height: expect.stringMatching(/[0-9]+/),
    chain_id: /[0-9]+/,
    epoch: expect.stringMatching(/[0-9]+/),
    git_hash: expect.stringMatching(/[0-9a-f]{5,40}/),
    ledger_timestamp: expect.stringMatching(/[0-9]+/),
    node_role: expect.stringMatching("full_node"),
    oldest_block_height: expect.stringMatching(/[0-9]+/),
    oldest_ledger_version: expect.stringMatching(/[0-9]+/),
  });
});

test("Shinami Aptos client can query GraphQL", async () => {
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
        chain_id: /[0-2]+/,
      },
    ],
  });
});
