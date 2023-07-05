import { expect, test } from "@jest/globals";
import { createSuiClient } from "./integration.env";

const sui = createSuiClient();

test("Shinami Sui RPC can get latest system state", async () => {
  const state = await sui.getLatestSuiSystemState();
  expect(state).toMatchObject({
    protocolVersion: /[0-9]+/,
    epoch: /[0-9]+/,
  });
});
