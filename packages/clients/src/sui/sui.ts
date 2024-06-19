/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SuiClient, SuiHTTPTransport } from "@mysten/sui/client";

const NODE_RPC_URL = "https://api.shinami.com/node/v1";
const NODE_WS_URL = "wss://api.shinami.com/node/v1";

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
  url: string = NODE_RPC_URL,
  wsUrl: string = NODE_WS_URL,
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
