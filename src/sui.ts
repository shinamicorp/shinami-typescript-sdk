/**
 * Copyright 2023 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Connection, JsonRpcProvider } from "@mysten/sui.js";

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
export function createSuiProvider(
  accessKey: string,
  url: string = NODE_RPC_URL,
  wsUrl: string = NODE_WS_URL
): JsonRpcProvider {
  return new JsonRpcProvider(
    new Connection({
      fullnode: `${url}/${accessKey}`,
      websocket: `${wsUrl}/${accessKey}`,
    })
  );
}
