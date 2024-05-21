/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect, test } from "@jest/globals";
import { createSuiClient } from "./integration.env.js";

const sui = createSuiClient();

test("Shinami Sui RPC can get latest system state", async () => {
  const state = await sui.getLatestSuiSystemState();
  expect(state).toMatchObject({
    protocolVersion: /[0-9]+/,
    epoch: /[0-9]+/,
  });
});
