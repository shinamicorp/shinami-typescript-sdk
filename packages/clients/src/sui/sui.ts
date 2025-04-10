/**
 * Copyright 2023-2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient, SuiHTTPTransport } from "@mysten/sui/client";
import { NodeRpcUrls, NodeWsUrls } from "./endpoints.js";
import { inferUrlFromAccessKey } from "../region.js";

/**
 * Creates a Sui RPC client using Shinami Node service.
 * @param accessKey Node access key. Note that the access key also determines which network you are
 *    targeting.
 * @param url Optional JSON RPC URL override.
 * @param wsUrl Optional WebSocket URL override.
 * @returns Sui RPC client using Shinami Node service.
 */
export function createSuiClient(
  accessKey: string,
  url: string = inferUrlFromAccessKey(
    accessKey,
    NodeRpcUrls,
    (nodeRpcUrls) => nodeRpcUrls.us1,
  ),
  wsUrl: string = inferUrlFromAccessKey(
    accessKey,
    NodeWsUrls,
    (nodeWsUrls) => nodeWsUrls.us1,
  ),
): SuiClient {
  return new SuiClient({
    transport: new SuiHTTPTransport({
      url: `${url}/${accessKey}`,
      websocket: {
        url: `${wsUrl}/${accessKey}`,
      },
    }),
  });
}
