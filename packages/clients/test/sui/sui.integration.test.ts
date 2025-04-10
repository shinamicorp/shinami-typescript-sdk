/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { expect, test, jest } from "@jest/globals";
import { createSuiClient } from "./integration.env.js";
import { SuiHTTPTransport } from "@mysten/sui/client";
import { NodeRpcUrls } from "../../src/sui/index.js";

const sui = createSuiClient();

test("Shinami Sui RPC can get latest system state", async () => {
  const state = await sui.getLatestSuiSystemState();
  expect(state).toMatchObject({
    protocolVersion: /[0-9]+/,
    epoch: /[0-9]+/,
  });
});

test("Sui client issues request with expected headers", async () => {
  const mockResult = "12345";
  const fetch = jest.fn(() => {
    return Promise.resolve(
      new Response(
        new TextEncoder().encode(
          JSON.stringify({
            jsonrpc: "2.0",
            result: mockResult,
            id: 1,
          }),
        ),
        {
          status: 200,
        },
      ),
    );
  });

  const nodeRpcUrl = NodeRpcUrls.us1;
  const transport = new SuiHTTPTransport({
    url: nodeRpcUrl,
    rpc: {
      url: nodeRpcUrl,
    },
    fetch,
  });

  const result = await transport.request({
    method: "sui_getTotalTransactionBlocks",
    params: [],
  });

  expect(fetch).toHaveBeenCalledTimes(1);

  expect(fetch).toHaveBeenCalledWith(nodeRpcUrl, {
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sui_getTotalTransactionBlocks",
      params: [],
    }),
    headers: expect.anything(),
    method: "POST",
  });

  const calls: any[][] = fetch.mock.calls;
  expect(calls).toHaveLength(1);

  const actualHeaders = calls[0][1].headers;
  const headerKeys = Object.keys(actualHeaders).map((k) => k.toLowerCase());

  const allowedHeaders = [
    "content-type",
    "client-sdk-type",
    "client-sdk-version",
    "client-target-api-version",
    "app-name",
    "baggage",
    "sentry-trace",
    "client-request-method",
  ];

  expect(allowedHeaders).toEqual(expect.arrayContaining(headerKeys));
});
